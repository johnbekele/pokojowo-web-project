"""Jobs management routes - Simplified working implementation with live logging."""

import asyncio
import hashlib
import logging
import re
import json
import os
from datetime import datetime
from typing import Optional, Dict, List
from collections import deque

from fastapi import APIRouter, HTTPException, Request, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import httpx
from bs4 import BeautifulSoup

# Load Anthropic API key from settings
from src.config.settings import settings
ANTHROPIC_API_KEY = settings.anthropic_api_key

router = APIRouter()
logger = logging.getLogger(__name__)

# Store active job cancellation flags
_job_cancellation_flags: Dict[str, bool] = {}

# Store job logs for streaming (max 500 logs per job)
_job_logs: Dict[str, deque] = {}

# Store active SSE connections waiting for logs
_job_subscribers: Dict[str, List[asyncio.Queue]] = {}


def job_log(job_id: str, level: str, stage: str, message: str, data: dict = None):
    """Add a log entry for a job and notify subscribers."""
    log_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "level": level,
        "stage": stage,
        "message": message,
        "data": data or {}
    }

    # Store in job logs buffer
    if job_id not in _job_logs:
        _job_logs[job_id] = deque(maxlen=500)
    _job_logs[job_id].append(log_entry)

    # Notify all subscribers
    if job_id in _job_subscribers:
        for queue in _job_subscribers[job_id]:
            try:
                queue.put_nowait(log_entry)
            except asyncio.QueueFull:
                pass  # Skip if queue is full


def get_db_or_raise(request: Request):
    """Get database connection or raise 503 if not available."""
    db = request.app.state.db
    if db is None:
        raise HTTPException(
            status_code=503,
            detail="Database not connected. Please check MongoDB configuration."
        )
    return db


class JobCreateRequest(BaseModel):
    """Request to create a new scrape job."""
    site: str
    city: str
    max_listings: int = 50
    dry_run: bool = False


@router.get("")
async def list_jobs(
    request: Request,
    limit: int = 20,
    offset: int = 0,
    status: Optional[str] = None,
    site: Optional[str] = None,
):
    """List all scrape jobs with filtering."""
    db = get_db_or_raise(request)

    query = {}
    if status:
        query["status"] = status
    if site:
        query["site"] = site

    cursor = (
        db.scrape_jobs.find(query)
        .sort("created_at", -1)
        .skip(offset)
        .limit(limit)
    )

    jobs = await cursor.to_list(length=limit)
    total = await db.scrape_jobs.count_documents(query)

    # Convert ObjectId to string for JSON serialization
    for job in jobs:
        if "_id" in job:
            job["_id"] = str(job["_id"])

    return {
        "jobs": jobs,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/{job_id}")
async def get_job(request: Request, job_id: str):
    """Get a specific job by ID."""
    db = get_db_or_raise(request)

    job = await db.scrape_jobs.find_one({"job_id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if "_id" in job:
        job["_id"] = str(job["_id"])

    return job


@router.post("")
async def create_job(
    request: Request,
    job_request: JobCreateRequest,
    background_tasks: BackgroundTasks,
):
    """Create and start a new scrape job."""
    db = get_db_or_raise(request)

    # Create job ID
    job_id = f"{job_request.site}-{job_request.city}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"

    # Create job document
    job_doc = {
        "job_id": job_id,
        "site": job_request.site,
        "city": job_request.city,
        "max_listings": job_request.max_listings,
        "dry_run": job_request.dry_run,
        "status": "pending",
        "created_at": datetime.utcnow(),
        "started_at": None,
        "completed_at": None,
        "error_message": None,
        "stats": {
            "total_found": 0,
            "scraped": 0,
            "saved": 0,
            "duplicates": 0,
            "failed": 0,
        },
    }

    # Save to database
    await db.scrape_jobs.insert_one(job_doc)

    # Initialize cancellation flag
    _job_cancellation_flags[job_id] = False

    # Start job in background
    background_tasks.add_task(run_scrape_job, db, job_id, job_request)

    return {"job_id": job_id, "status": "pending", "message": "Job created and queued"}


@router.delete("/{job_id}")
async def cancel_job(request: Request, job_id: str):
    """Cancel a running job."""
    db = get_db_or_raise(request)

    # Set cancellation flag
    _job_cancellation_flags[job_id] = True

    result = await db.scrape_jobs.update_one(
        {"job_id": job_id, "status": {"$in": ["running", "pending"]}},
        {
            "$set": {
                "status": "cancelled",
                "completed_at": datetime.utcnow(),
                "error_message": "Cancelled by user",
            }
        },
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Job not found or not running")

    job_log(job_id, "warning", "cancelled", "Job cancelled by user")
    return {"message": "Job cancelled"}


@router.get("/{job_id}/logs")
async def get_job_logs(request: Request, job_id: str, limit: int = 100):
    """Get stored logs for a job."""
    if job_id not in _job_logs:
        return {"logs": [], "total": 0}

    logs = list(_job_logs[job_id])[-limit:]
    return {"logs": logs, "total": len(logs)}


@router.get("/{job_id}/stream")
async def stream_job_logs(request: Request, job_id: str):
    """Stream job logs via Server-Sent Events."""

    async def event_generator():
        queue = asyncio.Queue(maxsize=100)

        # Register subscriber
        if job_id not in _job_subscribers:
            _job_subscribers[job_id] = []
        _job_subscribers[job_id].append(queue)

        try:
            # Send existing logs first
            if job_id in _job_logs:
                for log in _job_logs[job_id]:
                    yield f"data: {json.dumps(log)}\n\n"

            # Stream new logs
            while True:
                try:
                    # Wait for new log with timeout
                    log = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield f"data: {json.dumps(log)}\n\n"

                    # Check if job is done
                    if log.get("stage") == "completed" or log.get("stage") == "failed":
                        yield f"data: {json.dumps({'stage': 'stream_end', 'message': 'Job finished'})}\n\n"
                        break

                except asyncio.TimeoutError:
                    # Send keepalive
                    yield f": keepalive\n\n"

                    # Check if client disconnected
                    if await request.is_disconnected():
                        break

        finally:
            # Unregister subscriber
            if job_id in _job_subscribers and queue in _job_subscribers[job_id]:
                _job_subscribers[job_id].remove(queue)
                if not _job_subscribers[job_id]:
                    del _job_subscribers[job_id]

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


# ============================================================================
# SIMPLIFIED SCRAPER IMPLEMENTATION
# ============================================================================

CITY_SLUGS = {
    "warszawa": "warszawa",
    "krakow": "krakow",
    "wroclaw": "wroclaw",
    "poznan": "poznan",
    "gdansk": "gdansk",
    "szczecin": "szczecin",
    "lodz": "lodz",
    "katowice": "katowice",
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "Sec-Ch-Ua": '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"macOS"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
}


def get_olx_search_url(city: str, page: int = 1) -> str:
    """Build OLX search URL."""
    city_slug = CITY_SLUGS.get(city.lower(), city.lower())
    base = f"https://www.olx.pl/nieruchomosci/mieszkania/wynajem/{city_slug}/"
    if page > 1:
        return f"{base}?page={page}"
    return base


OTODOM_CITY_PATHS = {
    "warszawa": "mazowieckie/warszawa/warszawa/warszawa",
    "krakow": "malopolskie/krakow/krakow/krakow",
    "wroclaw": "dolnoslaskie/wroclaw/wroclaw/wroclaw",
    "poznan": "wielkopolskie/poznan/poznan/poznan",
    "gdansk": "pomorskie/gdansk/gdansk/gdansk",
    "szczecin": "zachodniopomorskie/szczecin/szczecin/szczecin",
    "lodz": "lodzkie/lodz/lodz/lodz",
    "katowice": "slaskie/katowice/katowice/katowice",
}


def get_otodom_search_url(city: str, page: int = 1) -> str:
    """Build Otodom search URL."""
    city_path = OTODOM_CITY_PATHS.get(city.lower(), f"cala-polska?locations=%5Bcity%3D{city}%5D")
    base = f"https://www.otodom.pl/pl/wyniki/wynajem/mieszkanie/{city_path}"
    if page > 1:
        return f"{base}?page={page}"
    return base


def extract_olx_listings_from_search(html: str, city: str) -> list[dict]:
    """Extract listing data directly from OLX search results page."""
    soup = BeautifulSoup(html, "lxml")
    listings = []

    cards = soup.select("[data-cy='l-card']")

    for card in cards:
        try:
            link = card.select_one("a[href*='/d/']")
            if not link or not link.get("href"):
                link = card.select_one("a")
                if not link or not link.get("href"):
                    continue

            url = link["href"]
            if not url.startswith("http"):
                url = f"https://www.olx.pl{url}"

            # Get title
            title = ""
            title_elem = card.select_one("h6") or card.select_one("h4")
            if title_elem:
                title = clean_text(title_elem.get_text())
            if not title:
                continue

            # Remove price from title if concatenated
            title = re.sub(r'\d[\d\s]*zł.*$', '', title).strip()
            title = re.sub(r'do negocjacji$', '', title).strip()

            # Get price
            price = None
            price_elem = card.select_one("[data-testid='ad-price']")
            if price_elem:
                price = extract_price(price_elem.get_text())
            if not price:
                for elem in card.select("p, span"):
                    txt = elem.get_text().strip()
                    if "zł" in txt and len(txt) < 30:
                        price = extract_price(txt)
                        if price:
                            break
            if not price or price < 100:
                continue

            # Get location
            location = city.capitalize()
            location_elem = card.select_one("[data-testid='location-date']")
            if location_elem:
                parts = location_elem.get_text().split(" - ")
                location = clean_text(parts[0])
            else:
                for elem in card.select("p"):
                    txt = elem.get_text()
                    if city.lower() in txt.lower():
                        location = clean_text(txt.split(" - ")[0])
                        break

            # Get image
            images = []
            for img in card.select("img"):
                src = img.get("src") or img.get("data-src")
                if src and ("apollo" in src or "img" in src) and src.startswith("http"):
                    if "placeholder" not in src.lower():
                        images.append(src)
                        break

            source_id = hashlib.md5(url.encode()).hexdigest()[:12]

            listings.append({
                "source_url": url,
                "source_site": "olx",
                "source_id": source_id,
                "title": title,
                "description": title,
                "price": price,
                "address": location,
                "size": 40.0,
                "images": images,
                "scraped_at": datetime.utcnow(),
            })

        except Exception as e:
            logger.error(f"Error extracting OLX card: {e}")
            continue

    return listings


def extract_otodom_listings_from_search(html: str, city: str) -> list[dict]:
    """Extract listing data directly from Otodom search results page."""
    soup = BeautifulSoup(html, "lxml")
    listings = []

    cards = soup.select("article[data-cy='listing-item'], li[data-cy='listing-item']")
    if not cards:
        # Fallback: find all links that contain /oferta/
        links = soup.select("a[href*='/oferta/']")
        for link in links:
            try:
                url = link.get("href", "")
                if not url.startswith("http"):
                    url = f"https://www.otodom.pl{url}"

                # Try to get parent container
                parent = link.find_parent("article") or link.find_parent("li") or link.find_parent("div")
                if parent:
                    cards.append(parent)
            except Exception:
                pass

    seen_urls = set()
    for card in cards:
        try:
            # Get URL
            link = card.select_one("a[href*='/oferta/']")
            if not link or not link.get("href"):
                continue
            url = link["href"]
            if not url.startswith("http"):
                url = f"https://www.otodom.pl{url}"

            # Skip duplicates
            if url in seen_urls:
                continue
            seen_urls.add(url)

            # Get title
            title_elem = card.select_one("p[data-cy='listing-item-title'], h3, h2")
            title = clean_text(title_elem.get_text()) if title_elem else ""
            if not title:
                title = clean_text(link.get_text())
            if not title or len(title) < 5:
                continue

            # Get price
            price = None
            price_elem = card.select_one("[data-cy='listing-item-price'], span[class*='price']")
            if price_elem:
                price = extract_price(price_elem.get_text())
            if not price:
                # Try finding any text with zł
                for elem in card.select("span, p"):
                    txt = elem.get_text()
                    if "zł" in txt:
                        price = extract_price(txt)
                        if price:
                            break
            if not price or price < 100:
                continue

            # Get location
            location = city.capitalize()
            loc_elem = card.select_one("[data-cy='listing-item-location'], p[class*='location']")
            if loc_elem:
                location = clean_text(loc_elem.get_text())

            # Get size
            size = None
            for elem in card.select("span, dd"):
                txt = elem.get_text()
                if "m²" in txt or "m2" in txt:
                    size = extract_size(txt)
                    if size:
                        break

            # Get image
            images = []
            img_elem = card.select_one("img[src*='img.otodom'], img[src]")
            if img_elem and img_elem.get("src"):
                src = img_elem["src"]
                if "otodom" in src or src.startswith("http"):
                    images.append(src)

            source_id = hashlib.md5(url.encode()).hexdigest()[:12]

            listings.append({
                "source_url": url,
                "source_site": "otodom",
                "source_id": source_id,
                "title": title,
                "description": title,
                "price": price,
                "address": location,
                "size": size or 40.0,
                "images": images,
                "scraped_at": datetime.utcnow(),
            })

        except Exception as e:
            logger.error(f"Error extracting Otodom card: {e}")
            continue

    return listings


def generate_dedup_hash(url: str, address: str, price: float) -> str:
    """Generate deduplication hash."""
    content = f"{url}|{address}|{price}"
    return hashlib.md5(content.encode()).hexdigest()


def clean_text(text: str) -> str:
    """Clean extracted text."""
    if not text:
        return ""
    return re.sub(r"\s+", " ", text).strip()


def extract_price(text: str) -> Optional[float]:
    """Extract numeric price."""
    if not text:
        return None
    text = text.replace("zł", "").replace("PLN", "").replace(" ", "").replace(",", ".")
    match = re.search(r"[\d.]+", text)
    if match:
        try:
            return float(match.group())
        except ValueError:
            return None
    return None


def extract_size(text: str) -> Optional[float]:
    """Extract size in m²."""
    if not text:
        return None
    text = text.replace("m²", "").replace("m2", "").replace(" ", "").replace(",", ".")
    match = re.search(r"[\d.]+", text)
    if match:
        try:
            return float(match.group())
        except ValueError:
            return None
    return None


async def extract_olx_listing(url: str, html: str) -> Optional[dict]:
    """Extract listing data from OLX detail page."""
    soup = BeautifulSoup(html, "lxml")

    try:
        # Title
        title_elem = soup.select_one("[data-cy='ad_title']")
        title = clean_text(title_elem.get_text()) if title_elem else ""
        if not title:
            return None

        # Price
        price_elem = soup.select_one("[data-testid='ad-price-container'] h3")
        if not price_elem:
            price_elem = soup.select_one("[data-cy='ad_price']")
        price = extract_price(price_elem.get_text() if price_elem else "")
        if not price or price < 100:
            return None

        # Description
        desc_elem = soup.select_one("[data-cy='ad_description'] div")
        if not desc_elem:
            desc_elem = soup.select_one("[data-cy='ad_description']")
        description = clean_text(desc_elem.get_text()) if desc_elem else ""

        # Location
        location_elem = soup.select_one("[data-testid='map-link'] p")
        if not location_elem:
            location_elem = soup.select_one("[aria-label*='Lokalizacja']")
        address = clean_text(location_elem.get_text()) if location_elem else "Unknown"

        # Images
        images = []
        swiper = soup.select_one("[data-cy='ad-photo-swiper']")
        if swiper:
            for img in swiper.select("img[src*='img']"):
                src = img.get("src") or img.get("data-src")
                if src and "olx" in src:
                    images.append(src)

        # Fallback image extraction
        if not images:
            for img in soup.select("img[src*='ireland.apollo']"):
                src = img.get("src")
                if src:
                    images.append(src)

        # Size from params
        size = None
        params = soup.select("[data-testid='ad-params-container'] li")
        for param in params:
            text = param.get_text().lower()
            if "m²" in text or "powierzchnia" in text:
                size = extract_size(text)
                break

        # Extract ID from URL
        source_id = hashlib.md5(url.encode()).hexdigest()[:12]
        id_match = re.search(r"ID([a-zA-Z0-9]+)", url)
        if id_match:
            source_id = id_match.group(1)

        return {
            "source_url": url,
            "source_site": "olx",
            "source_id": source_id,
            "title": title,
            "description": description,
            "price": price,
            "address": address,
            "size": size or 40.0,
            "images": images[:10],
            "scraped_at": datetime.utcnow(),
        }

    except Exception as e:
        logger.error(f"Error extracting OLX listing {url}: {e}")
        return None


async def extract_otodom_listing(url: str, html: str) -> Optional[dict]:
    """Extract listing data from Otodom detail page."""
    soup = BeautifulSoup(html, "lxml")

    try:
        # Title
        title_elem = soup.select_one("h1")
        title = clean_text(title_elem.get_text()) if title_elem else ""
        if not title:
            return None

        # Price
        price = None
        for elem in soup.select("[data-cy='adPageHeaderPrice']"):
            price = extract_price(elem.get_text())
            if price:
                break
        if not price:
            price_elem = soup.select_one("strong[aria-label*='Cena']")
            if price_elem:
                price = extract_price(price_elem.get_text())
        if not price or price < 100:
            return None

        # Description
        desc_elem = soup.select_one("[data-cy='adPageAdDescription']")
        description = clean_text(desc_elem.get_text()) if desc_elem else ""

        # Address
        address_elem = soup.select_one("[aria-label='Adres']")
        if not address_elem:
            address_elem = soup.select_one("a[href*='map']")
        address = clean_text(address_elem.get_text()) if address_elem else title

        # Images
        images = []
        for img in soup.select("img[src*='img.otodom']"):
            src = img.get("src")
            if src and "otodom" in src:
                images.append(src)

        # Size
        size = None
        for elem in soup.select("[aria-label*='Powierzchnia']"):
            size = extract_size(elem.get_text())
            if size:
                break

        source_id = hashlib.md5(url.encode()).hexdigest()[:12]

        return {
            "source_url": url,
            "source_site": "otodom",
            "source_id": source_id,
            "title": title,
            "description": description,
            "price": price,
            "address": address,
            "size": size or 40.0,
            "images": images[:10],
            "scraped_at": datetime.utcnow(),
        }

    except Exception as e:
        logger.error(f"Error extracting Otodom listing {url}: {e}")
        return None


async def fetch_detail_page(client: httpx.AsyncClient, url: str, site: str, job_id: str) -> Optional[dict]:
    """Fetch and extract full listing data from detail page."""
    try:
        job_log(job_id, "debug", "details", f"Fetching detail page", {"url": url[:60]})
        response = await client.get(url)
        response.raise_for_status()

        # Check for blocking
        if 'g-recaptcha' in response.text or 'Access Denied' in response.text:
            job_log(job_id, "warning", "details", "Blocked on detail page")
            return None

        if site == "olx":
            return await extract_olx_detail_page(url, response.text)
        elif site == "otodom":
            return await extract_otodom_detail_page(url, response.text)
        return None
    except Exception as e:
        job_log(job_id, "debug", "details", f"Failed to fetch detail: {str(e)[:50]}")
        return None


async def extract_olx_detail_page(url: str, html: str) -> Optional[dict]:
    """Extract full data from OLX detail page."""
    soup = BeautifulSoup(html, "lxml")

    try:
        # Title
        title_elem = soup.select_one("[data-cy='ad_title'], h1")
        title = clean_text(title_elem.get_text()) if title_elem else ""
        if not title:
            return None

        # Price
        price = None
        price_elem = soup.select_one("[data-testid='ad-price-container'] h3, [data-cy='ad_price']")
        if price_elem:
            price = extract_price(price_elem.get_text())
        if not price or price < 100:
            return None

        # Description - full text
        description = ""
        desc_elem = soup.select_one("[data-cy='ad_description']")
        if desc_elem:
            description = clean_text(desc_elem.get_text())

        # Location/Address
        address = ""
        loc_elem = soup.select_one("[data-testid='map-link'] p, [class*='LocationLabel']")
        if loc_elem:
            address = clean_text(loc_elem.get_text())
        if not address:
            # Try breadcrumbs
            breadcrumbs = soup.select("[data-testid='breadcrumb-item']")
            if breadcrumbs:
                address = ", ".join([clean_text(b.get_text()) for b in breadcrumbs[-3:]])

        # Images - get ALL from gallery
        images = []
        # Try swiper/gallery first
        for img in soup.select("[data-cy='ad-photo-swiper'] img, [class*='swiper'] img"):
            src = img.get("src") or img.get("data-src")
            if src and src.startswith("http") and "placeholder" not in src.lower():
                # Get high-res version
                src = re.sub(r';s=\d+x\d+', ';s=1024x768', src)
                if src not in images:
                    images.append(src)
        # Fallback to all images
        if not images:
            for img in soup.select("img[src*='apollo'], img[src*='olxcdn']"):
                src = img.get("src")
                if src and src.startswith("http") and "placeholder" not in src.lower():
                    if src not in images:
                        images.append(src)

        # Size and rooms from parameters
        size = None
        rooms = None
        phone = None

        # Parse parameter list
        params = soup.select("[data-testid='ad-params-container'] li, [class*='params'] li")
        for param in params:
            text = param.get_text().lower()
            if "powierzchnia" in text or "m²" in text:
                size = extract_size(text)
            elif "pokoi" in text or "pokoje" in text or "liczba pokoi" in text:
                rooms_match = re.search(r'(\d+)', text)
                if rooms_match:
                    rooms = int(rooms_match.group(1))

        # Phone extraction - try multiple sources
        phone = None

        # 1. Try to extract phone from description text
        if description:
            phone = extract_phone_from_text(description)

        # 2. Try title
        if not phone and title:
            phone = extract_phone_from_text(title)

        # 3. Try tel: links
        if not phone:
            phone_elem = soup.select_one("a[href^='tel:']")
            if phone_elem:
                phone_href = phone_elem.get("href", "")
                if phone_href.startswith("tel:"):
                    phone = phone_href.replace("tel:", "").strip()

        # 4. Check phone container (usually masked)
        if not phone:
            phone_container = soup.select_one("[data-testid='phones-container']")
            if phone_container:
                container_text = phone_container.get_text()
                # Check if it contains actual numbers
                if re.search(r'\d{3}', container_text):
                    extracted = extract_phone_from_text(container_text)
                    if extracted:
                        phone = extracted
                elif "xxx" in container_text.lower():
                    phone = "hidden"  # Phone exists but masked

        source_id = hashlib.md5(url.encode()).hexdigest()[:12]
        id_match = re.search(r"ID([a-zA-Z0-9]+)", url)
        if id_match:
            source_id = id_match.group(1)

        return {
            "source_url": url,
            "source_site": "olx",
            "source_id": source_id,
            "title": title,
            "description": description,
            "price": price,
            "address": address,
            "size": size or 40.0,
            "rooms": rooms,
            "phone": phone,
            "images": images[:15],
            "scraped_at": datetime.utcnow(),
        }
    except Exception as e:
        logger.error(f"Error extracting OLX detail {url}: {e}")
        return None


async def extract_otodom_detail_page(url: str, html: str) -> Optional[dict]:
    """Extract full data from Otodom detail page using __NEXT_DATA__ JSON."""
    soup = BeautifulSoup(html, "lxml")

    try:
        # Otodom uses Next.js - extract data from __NEXT_DATA__ script
        next_data_script = soup.select_one("script#__NEXT_DATA__")
        if next_data_script and next_data_script.string:
            try:
                next_data = json.loads(next_data_script.string)
                # Navigate to the ad data
                props = next_data.get("props", {})
                page_props = props.get("pageProps", {})
                ad = page_props.get("ad", {})

                if ad:
                    # Extract all the rich data
                    title = ad.get("title", "")
                    if not title:
                        return None

                    # Price
                    price_obj = ad.get("target", {}).get("Price", None)
                    if not price_obj:
                        characteristics = ad.get("characteristics", [])
                        for char in characteristics:
                            if char.get("key") == "price":
                                price_obj = char.get("value")
                                break
                    price = float(price_obj) if price_obj else None
                    if not price or price < 100:
                        # Try from topInformation
                        top_info = ad.get("topInformation", [])
                        for info in top_info:
                            if "zł" in str(info.get("value", "")):
                                price = extract_price(str(info.get("value", "")))
                                break
                    if not price or price < 100:
                        return None

                    # Description - full HTML converted to text
                    description = ad.get("description", "")
                    if description:
                        # Clean HTML tags
                        desc_soup = BeautifulSoup(description, "lxml")
                        description = clean_text(desc_soup.get_text())

                    # Address/Location
                    location = ad.get("location", {})
                    address_parts = []
                    if location.get("address", {}).get("city", {}).get("name"):
                        address_parts.append(location["address"]["city"]["name"])
                    if location.get("address", {}).get("district", {}).get("name"):
                        address_parts.append(location["address"]["district"]["name"])
                    if location.get("address", {}).get("street", {}).get("name"):
                        address_parts.append(location["address"]["street"]["name"])
                    address = ", ".join(address_parts) if address_parts else ""

                    # Images - get all from the images array
                    images = []
                    for img in ad.get("images", []):
                        if isinstance(img, dict):
                            # Get large version
                            large_url = img.get("large") or img.get("medium") or img.get("small")
                            if large_url:
                                images.append(large_url)
                        elif isinstance(img, str):
                            images.append(img)

                    # Size and rooms from characteristics or target
                    size = None
                    rooms = None

                    target = ad.get("target", {})
                    if target.get("Area"):
                        size = float(target["Area"])
                    if target.get("Rooms_num"):
                        rooms_val = target["Rooms_num"]
                        if isinstance(rooms_val, list):
                            rooms_val = rooms_val[0] if rooms_val else None
                        if rooms_val:
                            try:
                                rooms = int(rooms_val)
                            except:
                                pass

                    # Also check characteristics
                    for char in ad.get("characteristics", []):
                        key = char.get("key", "").lower()
                        value = char.get("value")
                        if "area" in key or "powierzchnia" in key:
                            if not size and value:
                                size = extract_size(str(value))
                        elif "room" in key or "pokoi" in key:
                            if not rooms and value:
                                try:
                                    rooms = int(re.search(r'\d+', str(value)).group())
                                except:
                                    pass

                    # Phone extraction - try multiple sources
                    phone = None

                    # 1. Try to extract phone from description text
                    if description:
                        phone = extract_phone_from_text(description)

                    # 2. Try title
                    if not phone and title:
                        phone = extract_phone_from_text(title)

                    # 3. Try owner phone (may be masked like +**********5)
                    if not phone:
                        owner = ad.get("owner", {})
                        phones = owner.get("phones", [])
                        if phones and isinstance(phones[0], str):
                            owner_phone = phones[0]
                            # Check if it's not fully masked
                            if not re.match(r'^\+\*+\d?$', owner_phone):
                                phone = owner_phone
                            else:
                                # Store masked indicator
                                phone = "hidden"  # Indicates phone exists but is masked

                    source_id = str(ad.get("id", hashlib.md5(url.encode()).hexdigest()[:12]))

                    return {
                        "source_url": url,
                        "source_site": "otodom",
                        "source_id": source_id,
                        "title": title,
                        "description": description[:2000] if description else "",
                        "price": price,
                        "address": address,
                        "size": size or 40.0,
                        "rooms": rooms,
                        "phone": phone,
                        "images": images[:15],
                        "scraped_at": datetime.utcnow(),
                    }
            except json.JSONDecodeError:
                logger.error(f"Failed to parse __NEXT_DATA__ JSON for {url}")

        # Fallback to HTML parsing if __NEXT_DATA__ not found
        title_elem = soup.select_one("h1")
        title = clean_text(title_elem.get_text()) if title_elem else ""
        if not title:
            return None

        source_id = hashlib.md5(url.encode()).hexdigest()[:12]
        return {
            "source_url": url,
            "source_site": "otodom",
            "source_id": source_id,
            "title": title,
            "description": "",
            "price": 0,
            "address": "",
            "size": 40.0,
            "rooms": None,
            "phone": None,
            "images": [],
            "scraped_at": datetime.utcnow(),
        }

    except Exception as e:
        logger.error(f"Error extracting Otodom detail {url}: {e}")
        return None


async def translate_and_enrich_listing(client: httpx.AsyncClient, listing: dict, job_id: str) -> dict:
    """
    Use Claude API to translate description and enrich listing data.
    Returns enriched listing with:
    - description.en (translated English)
    - description.pl (original Polish)
    - close_to (extracted amenities)
    - building_type (detected from description)
    - room_type (validated/corrected)
    """
    if not ANTHROPIC_API_KEY:
        job_log(job_id, "warning", "translate", "No Anthropic API key - skipping translation")
        return listing

    description_pl = listing.get("description", "")
    title = listing.get("title", "")
    address = listing.get("address", "")
    size = listing.get("size", 40)
    rooms = listing.get("rooms")

    if not description_pl or len(description_pl) < 20:
        # Not enough text to translate
        return listing

    # Check if we already have a phone
    existing_phone = listing.get("phone")
    phone_instruction = ""
    if not existing_phone or existing_phone == "hidden":
        phone_instruction = """5. Extract any phone number mentioned in the description (format: +48 XXX XXX XXX)
"""

    prompt = f"""Analyze this Polish rental listing and provide a structured JSON response.

LISTING DATA:
Title: {title}
Address: {address}
Size: {size} m²
Rooms: {rooms or "unknown"}
Description (Polish):
{description_pl[:2500]}

TASK:
1. Translate the description to clear, professional English
2. Extract nearby amenities/locations mentioned
3. Detect the building type
4. Determine room type based on size and description
{phone_instruction}
RESPOND WITH ONLY VALID JSON (no markdown, no explanation):
{{
  "description_en": "Full English translation of the description...",
  "close_to": ["Amenity 1", "Amenity 2", ...],
  "building_type": "Apartment" | "Loft" | "Block" | "Detached_House",
  "room_type": "Single" | "Double" | "Suite",
  "max_tenants": 1-6,
  "phone": "+48 XXX XXX XXX or null if not found"
}}

Guidelines:
- close_to: Extract specific amenities like "Metro station", "AGH University", "Shopping mall", "Park", "City center", "Train station", etc.
- building_type: Default to "Apartment" if unclear. Use "Block" for communist-era buildings (blok), "Loft" for industrial conversions, "Detached_House" for houses.
- room_type: "Single" for <30m², "Double" for 30-60m², "Suite" for >60m² or 3+ rooms
- max_tenants: Based on rooms and size (typically rooms * 2)
- phone: Extract Polish phone number if mentioned (usually 9 digits, may start with +48 or 48). Return null if not found."""

    try:
        response = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": "claude-sonnet-4-5-20250929",
                "max_tokens": 2000,
                "messages": [
                    {"role": "user", "content": prompt}
                ]
            },
            timeout=60.0
        )
        response.raise_for_status()
        result = response.json()

        # Extract text from Claude response
        content = result.get("content", [])
        if content and len(content) > 0:
            text = content[0].get("text", "")

            # Parse JSON from response
            try:
                # Clean up response - remove markdown code blocks if present
                text = text.strip()
                if text.startswith("```"):
                    text = re.sub(r'^```(?:json)?\s*', '', text)
                    text = re.sub(r'\s*```$', '', text)

                enriched = json.loads(text)

                # Update listing with enriched data
                listing["description"] = {
                    "pl": description_pl,
                    "en": enriched.get("description_en", "")
                }

                # Merge close_to (keep existing + new)
                existing_close_to = listing.get("close_to", [])
                new_close_to = enriched.get("close_to", [])
                merged_close_to = list(set(existing_close_to + new_close_to))
                listing["close_to"] = merged_close_to[:15]  # Limit to 15

                # Update building type if detected
                building_type = enriched.get("building_type", "Apartment")
                if building_type in ["Apartment", "Loft", "Block", "Detached_House"]:
                    listing["building_type"] = building_type

                # Update room type if detected
                room_type = enriched.get("room_type", "Single")
                if room_type in ["Single", "Double", "Suite"]:
                    listing["room_type"] = room_type

                # Update max_tenants
                max_tenants = enriched.get("max_tenants")
                if max_tenants and isinstance(max_tenants, int) and 1 <= max_tenants <= 10:
                    listing["max_tenants"] = max_tenants

                # Update phone if AI found one and we don't have it
                ai_phone = enriched.get("phone")
                current_phone = listing.get("phone")
                if ai_phone and ai_phone != "null" and isinstance(ai_phone, str):
                    # Validate it looks like a real phone
                    if re.search(r'\d{9}', ai_phone.replace(" ", "")):
                        if not current_phone or current_phone == "hidden":
                            listing["phone"] = ai_phone
                            job_log(job_id, "info", "translate", f"Found phone in description: {ai_phone}")

                listing["ai_enriched"] = True
                has_phone = listing.get("phone") and listing.get("phone") != "hidden"
                job_log(job_id, "info", "translate", f"Translated: {len(enriched.get('description_en', ''))} chars EN, {len(merged_close_to)} amenities, phone: {'yes' if has_phone else 'no'}")

            except json.JSONDecodeError as e:
                job_log(job_id, "warning", "translate", f"Failed to parse AI response: {str(e)[:50]}")
                # Fallback: set empty English description
                listing["description"] = {
                    "pl": description_pl,
                    "en": ""
                }

    except httpx.HTTPStatusError as e:
        job_log(job_id, "warning", "translate", f"AI API error: {e.response.status_code}")
    except Exception as e:
        job_log(job_id, "warning", "translate", f"Translation error: {str(e)[:50]}")

    return listing


async def run_scrape_job(db, job_id: str, job_request: JobCreateRequest):
    """Background task to run AI-powered autonomous scraping job."""
    from src.api.routes.ai_scraper import ai_extract_listing, generate_dedup_hash

    # Initialize job logs
    _job_logs[job_id] = deque(maxlen=500)

    def log_cb(level: str, message: str):
        job_log(job_id, level, "ai_extract", message)

    job_log(job_id, "info", "init", "🤖 AI-Powered Scrape Job Started", {
        "site": job_request.site,
        "city": job_request.city,
        "max_listings": job_request.max_listings
    })

    # Update job status to running
    await db.scrape_jobs.update_one(
        {"job_id": job_id},
        {"$set": {"status": "running", "started_at": datetime.utcnow()}},
    )

    stats = {
        "total_found": 0,
        "ai_extracted": 0,
        "ai_rejected": 0,
        "saved": 0,
        "duplicates": 0,
        "failed": 0,
    }

    try:
        job_log(job_id, "info", "init", "Creating HTTP client with AI extraction...")

        async with httpx.AsyncClient(headers=HEADERS, timeout=45.0, follow_redirects=True) as client:
            # Select search URL builder based on site
            if job_request.site == "olx":
                get_search_url = get_olx_search_url
                job_log(job_id, "info", "init", "🔍 AI Agent: OLX Poland")
            elif job_request.site == "otodom":
                get_search_url = get_otodom_search_url
                job_log(job_id, "info", "init", "🔍 AI Agent: Otodom Poland")
            else:
                job_log(job_id, "error", "init", f"Unsupported site: {job_request.site}")
                raise ValueError(f"Unsupported site: {job_request.site}")

            listing_urls = []

            # PHASE 1: Collect listing URLs from search pages
            job_log(job_id, "info", "collecting", "📋 Phase 1: Collecting listing URLs from search pages")

            for page in range(1, 6):  # Fewer pages, more thorough extraction
                if _job_cancellation_flags.get(job_id):
                    job_log(job_id, "warning", "collecting", "Job cancelled by user")
                    break

                if len(listing_urls) >= job_request.max_listings:
                    job_log(job_id, "info", "collecting", f"Reached max listings limit ({job_request.max_listings})")
                    break

                search_url = get_search_url(job_request.city, page)
                job_log(job_id, "info", "collecting", f"Fetching search page {page}", {"url": search_url})

                try:
                    response = await client.get(search_url)
                    response.raise_for_status()

                    # Check for blocking
                    if 'g-recaptcha' in response.text or 'Access Denied' in response.text:
                        job_log(job_id, "warning", "collecting", "CAPTCHA or block detected, stopping")
                        break

                    # Extract listing URLs from search page
                    soup = BeautifulSoup(response.text, "lxml")

                    if job_request.site == "olx":
                        links = soup.select("a[href*='/d/oferta/']")
                    else:  # otodom
                        links = soup.select("a[href*='/oferta/']")

                    page_urls = []
                    for link in links:
                        href = link.get("href", "")
                        if href:
                            if not href.startswith("http"):
                                if job_request.site == "olx":
                                    href = f"https://www.olx.pl{href}"
                                else:
                                    href = f"https://www.otodom.pl{href}"
                            if href not in listing_urls:
                                page_urls.append(href)

                    job_log(job_id, "info", "collecting", f"Found {len(page_urls)} listing URLs on page {page}")
                    listing_urls.extend(page_urls)

                    if not page_urls:
                        break

                    await asyncio.sleep(2)

                except Exception as e:
                    job_log(job_id, "error", "collecting", f"Error: {str(e)[:50]}")
                    break

            # Deduplicate and limit
            listing_urls = list(dict.fromkeys(listing_urls))[:job_request.max_listings]
            stats["total_found"] = len(listing_urls)
            job_log(job_id, "info", "collecting", f"📊 Found {len(listing_urls)} unique listing URLs")

            if not listing_urls:
                job_log(job_id, "warning", "collecting", "No listings found - site may be blocking")

            # PHASE 2: AI-Powered Extraction (fetch + extract + validate in one step)
            job_log(job_id, "info", "ai_extract", f"🤖 Phase 2: AI Agent extracting {len(listing_urls)} listings")

            quality_listings = []

            for i, url in enumerate(listing_urls):
                if _job_cancellation_flags.get(job_id):
                    job_log(job_id, "warning", "ai_extract", "Job cancelled by user")
                    break

                job_log(job_id, "info", "ai_extract", f"🔍 Processing {i+1}/{len(listing_urls)}: {url[:60]}...")

                try:
                    # Fetch the detail page
                    response = await client.get(url, timeout=30.0)

                    if response.status_code != 200:
                        stats["failed"] += 1
                        job_log(job_id, "warning", "ai_extract", f"HTTP {response.status_code} - skipping")
                        continue

                    # AI extraction and validation
                    listing = await ai_extract_listing(
                        client,
                        response.text,
                        url,
                        job_request.site,
                        log_cb
                    )

                    if listing:
                        stats["ai_extracted"] += 1
                        quality_listings.append(listing)
                        job_log(job_id, "info", "ai_extract",
                            f"✅ Extracted: {len(listing.get('images', []))} imgs, "
                            f"{len(listing.get('description', {}).get('en', ''))} char EN, "
                            f"phone: {'✓' if listing.get('phone') else '✗'}"
                        )
                    else:
                        stats["ai_rejected"] += 1
                        job_log(job_id, "warning", "ai_extract", "❌ AI rejected - low quality")

                except Exception as e:
                    stats["failed"] += 1
                    job_log(job_id, "error", "ai_extract", f"Error: {str(e)[:50]}")

                # Rate limit (3 seconds between requests + AI calls)
                await asyncio.sleep(3)

                # Update progress
                if (i + 1) % 3 == 0:
                    await db.scrape_jobs.update_one(
                        {"job_id": job_id},
                        {"$set": {"stats": stats}},
                    )

            job_log(job_id, "info", "ai_extract",
                f"🎯 AI Extraction complete: {stats['ai_extracted']} quality listings, "
                f"{stats['ai_rejected']} rejected"
            )

            enriched_listings = quality_listings

            # PHASE 3: Save quality listings to database
            job_log(job_id, "info", "saving", f"💾 Phase 3: Saving {len(enriched_listings)} quality listings")

            for i, listing_data in enumerate(enriched_listings):
                if _job_cancellation_flags.get(job_id):
                    job_log(job_id, "warning", "saving", "Job cancelled by user")
                    break

                try:
                    dedup_hash = generate_dedup_hash(
                        listing_data["source_url"],
                        listing_data.get("address", ""),
                        listing_data.get("price", 0)
                    )

                    existing = await db.pending_approvals.find_one({"dedup_hash": dedup_hash})
                    if existing:
                        stats["duplicates"] += 1
                        job_log(job_id, "debug", "saving", f"Skipping duplicate")
                        continue

                    # Data is already validated and enriched by AI
                    description = listing_data.get("description", {})
                    if not isinstance(description, dict):
                        description = {"pl": str(description), "en": ""}

                    phone = listing_data.get("phone")
                    has_phone = phone and phone != "hidden" and phone != "null"

                    can_be_contacted = ["Message"]
                    if has_phone:
                        can_be_contacted.append("Phone")

                    pending_doc = {
                        "dedup_hash": dedup_hash,
                        "job_id": job_id,
                        "status": "pending",
                        "created_at": datetime.utcnow(),
                        "reviewed_at": None,
                        "reviewed_by": None,
                        "rejection_reason": None,
                        "city": job_request.city,
                        "source_url": listing_data["source_url"],
                        "source_site": listing_data["source_site"],
                        "source_id": listing_data.get("source_id", ""),
                        "title": listing_data.get("title", ""),
                        "description": description,
                        "price": listing_data.get("price", 0),
                        "address": listing_data.get("address", ""),
                        "size": listing_data.get("size", 40.0),
                        "rooms": listing_data.get("rooms"),
                        "phone": phone if has_phone else None,
                        "images": listing_data.get("images", []),
                        "room_type": listing_data.get("room_type", "Single"),
                        "building_type": listing_data.get("building_type", "Apartment"),
                        "rent_for_only": ["Open to All"],
                        "max_tenants": listing_data.get("max_tenants", 2),
                        "can_be_contacted": can_be_contacted,
                        "close_to": listing_data.get("close_to", []),
                        "available_from": datetime.utcnow(),
                        "ai_help": True,  # AI extracted
                        "data_quality": {
                            "completeness": 0.95,
                            "confidence": 0.95,
                            "has_images": len(listing_data.get("images", [])) > 0,
                            "image_count": len(listing_data.get("images", [])),
                            "has_description": bool(description.get("en")),
                            "has_phone": has_phone,
                            "ai_extracted": True,
                            "ai_translated": bool(description.get("en")),
                        },
                    }

                    await db.pending_approvals.insert_one(pending_doc)
                    stats["saved"] += 1

                    job_log(job_id, "info", "saving",
                        f"💾 Saved {i+1}/{len(enriched_listings)}: "
                        f"{listing_data.get('title', '')[:30]}... "
                        f"({len(listing_data.get('images', []))} imgs)"
                    )

                    # Update stats in DB periodically
                    if (i + 1) % 5 == 0:
                        await db.scrape_jobs.update_one(
                            {"job_id": job_id},
                            {"$set": {"stats": stats, "listings_found": stats["saved"]}},
                        )

                except Exception as e:
                    stats["failed"] += 1
                    job_log(job_id, "error", "saving", f"Error saving listing: {str(e)}")
                    continue

            # PHASE 5: Complete
            final_status = "cancelled" if _job_cancellation_flags.get(job_id) else "completed"
            await db.scrape_jobs.update_one(
                {"job_id": job_id},
                {
                    "$set": {
                        "status": final_status,
                        "completed_at": datetime.utcnow(),
                        "stats": stats,
                        "listings_found": stats["saved"],
                    }
                },
            )

            job_log(job_id, "info", "completed", f"Job {final_status}", {
                "total_found": stats["total_found"],
                "detail_fetched": stats["detail_fetched"],
                "scraped": stats["scraped"],
                "saved": stats["saved"],
                "duplicates": stats["duplicates"],
                "failed": stats["failed"]
            })

    except Exception as e:
        job_log(job_id, "error", "failed", f"Job failed: {str(e)}", {
            "error_type": type(e).__name__,
            "stats": stats
        })

        await db.scrape_jobs.update_one(
            {"job_id": job_id},
            {
                "$set": {
                    "status": "failed",
                    "completed_at": datetime.utcnow(),
                    "error_message": str(e),
                    "stats": stats,
                }
            },
        )
    finally:
        _job_cancellation_flags.pop(job_id, None)
        # Keep logs for a while, clean up after 10 minutes
        asyncio.create_task(cleanup_job_logs(job_id, delay=600))


async def cleanup_job_logs(job_id: str, delay: int = 600):
    """Clean up job logs after a delay."""
    await asyncio.sleep(delay)
    _job_logs.pop(job_id, None)
    _job_subscribers.pop(job_id, None)


def extract_phone_from_text(text: str) -> Optional[str]:
    """Extract Polish phone number from text (description, title, etc.)."""
    if not text:
        return None

    # Polish phone patterns
    patterns = [
        # +48 format
        r'\+48[\s.-]?(\d{3})[\s.-]?(\d{3})[\s.-]?(\d{3})',
        # 48 format
        r'(?<!\d)48[\s.-]?(\d{3})[\s.-]?(\d{3})[\s.-]?(\d{3})',
        # 9 digits with separators
        r'(?<!\d)(\d{3})[\s.-](\d{3})[\s.-](\d{3})(?!\d)',
        # 9 digits together
        r'(?<!\d)(\d{3})(\d{3})(\d{3})(?!\d)',
        # tel/telefon prefix
        r'(?:tel|telefon|phone|kontakt)[:\s.]*(\d{3})[\s.-]?(\d{3})[\s.-]?(\d{3})',
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            groups = match.groups()
            if len(groups) >= 3:
                phone = f"+48 {groups[0]} {groups[1]} {groups[2]}"
                return phone
            elif len(groups) == 1:
                # Single capture group - format it
                digits = re.sub(r'\D', '', groups[0])
                if len(digits) == 9:
                    return f"+48 {digits[:3]} {digits[3:6]} {digits[6:]}"

    return None


def extract_close_to(description: str) -> list[str]:
    """Extract nearby amenities/locations from description text."""
    if not description:
        return []

    close_to = []
    desc_lower = description.lower()

    # Polish keywords for amenities
    amenity_keywords = {
        "metro": "Metro",
        "tramwaj": "Tram",
        "autobus": "Bus",
        "przystanek": "Public transport",
        "komunikacja": "Public transport",
        "sklep": "Shops",
        "galeria": "Shopping mall",
        "centrum handlowe": "Shopping mall",
        "park": "Park",
        "zieleń": "Green areas",
        "las": "Forest",
        "szkoła": "School",
        "przedszkole": "Kindergarten",
        "uniwersytet": "University",
        "uczelnia": "University",
        "agh": "AGH University",
        "uj": "Jagiellonian University",
        "restauracja": "Restaurants",
        "kawiarnia": "Cafes",
        "siłownia": "Gym",
        "basen": "Swimming pool",
        "centrum miasta": "City center",
        "centrum": "City center",
        "stare miasto": "Old Town",
        "rynek": "Market Square",
        "rzeka": "River",
        "wisła": "Vistula River",
        "odra": "Oder River",
        "bulwar": "Boulevards",
        "lotnisko": "Airport",
        "dworzec": "Train/Bus station",
        "szpital": "Hospital",
        "przychodnia": "Medical clinic",
        "apteka": "Pharmacy",
    }

    for keyword, amenity in amenity_keywords.items():
        if keyword in desc_lower and amenity not in close_to:
            close_to.append(amenity)

    return close_to[:10]  # Limit to 10 amenities


def calculate_completeness(listing: dict) -> float:
    """Calculate data completeness score (0-1)."""
    weights = {
        "title": 1.0,
        "description": 2.0,  # Description is important
        "price": 1.0,
        "address": 1.0,
        "size": 0.5,
        "rooms": 0.5,
        "phone": 1.0,
        "images": 2.0,  # Images are important
    }
    total_weight = sum(weights.values())
    score = 0
    for field, weight in weights.items():
        value = listing.get(field)
        if field == "images":
            # More images = higher score
            img_count = len(value) if value else 0
            score += weight * min(img_count / 5, 1.0)  # Cap at 5 images
        elif field == "description":
            # Longer description = higher score
            desc_len = len(value) if value else 0
            score += weight * min(desc_len / 200, 1.0)  # Cap at 200 chars
        elif value:
            score += weight
    return round(score / total_weight, 2)

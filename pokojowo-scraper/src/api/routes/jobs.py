"""Jobs management routes - Simplified working implementation with live logging."""

import asyncio
import hashlib
import logging
import re
import json
from datetime import datetime
from typing import Optional, Dict, List
from collections import deque

from fastapi import APIRouter, HTTPException, Request, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import httpx
from bs4 import BeautifulSoup

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
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "pl-PL,pl;q=0.9,en;q=0.8",
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


async def run_scrape_job(db, job_id: str, job_request: JobCreateRequest):
    """Background task to run scraping job with live logging."""

    # Initialize job logs
    _job_logs[job_id] = deque(maxlen=500)

    job_log(job_id, "info", "init", "Scrape job started", {
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
        "scraped": 0,
        "saved": 0,
        "duplicates": 0,
        "failed": 0,
    }

    try:
        job_log(job_id, "info", "init", "Creating HTTP client...")

        async with httpx.AsyncClient(headers=HEADERS, timeout=30.0, follow_redirects=True) as client:
            # Select scraper based on site
            if job_request.site == "olx":
                get_search_url = get_olx_search_url
                extract_listings = extract_olx_listings_from_search
                job_log(job_id, "info", "init", "Using OLX scraper")
            elif job_request.site == "otodom":
                get_search_url = get_otodom_search_url
                extract_listings = extract_otodom_listings_from_search
                job_log(job_id, "info", "init", "Using Otodom scraper")
            else:
                job_log(job_id, "error", "init", f"Unsupported site: {job_request.site}")
                raise ValueError(f"Unsupported site: {job_request.site}")

            all_listings = []

            # PHASE 1: Collect listings from search pages
            job_log(job_id, "info", "collecting", "Starting to collect listings from search pages")

            for page in range(1, 10):
                if _job_cancellation_flags.get(job_id):
                    job_log(job_id, "warning", "collecting", "Job cancelled by user")
                    break

                if len(all_listings) >= job_request.max_listings:
                    job_log(job_id, "info", "collecting", f"Reached max listings limit ({job_request.max_listings})")
                    break

                search_url = get_search_url(job_request.city, page)
                job_log(job_id, "info", "collecting", f"Fetching page {page}", {"url": search_url})

                try:
                    response = await client.get(search_url)
                    job_log(job_id, "debug", "collecting", f"Response received", {
                        "status": response.status_code,
                        "size": len(response.text)
                    })
                    response.raise_for_status()

                    # Check for blocking
                    is_blocked = (
                        'class="g-recaptcha"' in response.text or
                        'data-sitekey=' in response.text or
                        '<title>Access Denied</title>' in response.text
                    )
                    if is_blocked:
                        job_log(job_id, "warning", "collecting", "CAPTCHA or block detected, stopping")
                        break

                    page_listings = extract_listings(response.text, job_request.city)
                    job_log(job_id, "info", "collecting", f"Found {len(page_listings)} listings on page {page}", {
                        "page": page,
                        "found": len(page_listings),
                        "total_so_far": len(all_listings) + len(page_listings)
                    })

                    if not page_listings:
                        job_log(job_id, "info", "collecting", "No more listings found, stopping pagination")
                        break

                    # Sample log
                    if page_listings:
                        sample = page_listings[0]
                        job_log(job_id, "debug", "collecting", "Sample listing", {
                            "title": sample.get("title", "")[:50],
                            "price": sample.get("price"),
                            "address": sample.get("address", "")[:40]
                        })

                    all_listings.extend(page_listings)

                    # Rate limiting
                    job_log(job_id, "debug", "collecting", "Rate limiting - waiting 2 seconds")
                    await asyncio.sleep(2)

                except httpx.HTTPStatusError as e:
                    job_log(job_id, "error", "collecting", f"HTTP Error: {e.response.status_code}")
                    break
                except Exception as e:
                    job_log(job_id, "error", "collecting", f"Error: {str(e)}")
                    break

            # PHASE 2: Deduplication
            job_log(job_id, "info", "dedup", f"Starting deduplication of {len(all_listings)} listings")

            seen_urls = set()
            unique_listings = []
            for listing in all_listings:
                if listing["source_url"] not in seen_urls:
                    seen_urls.add(listing["source_url"])
                    unique_listings.append(listing)
                    if len(unique_listings) >= job_request.max_listings:
                        break

            duplicates_removed = len(all_listings) - len(unique_listings)
            stats["total_found"] = len(unique_listings)

            job_log(job_id, "info", "dedup", "Deduplication complete", {
                "original": len(all_listings),
                "unique": len(unique_listings),
                "removed": duplicates_removed
            })

            if len(unique_listings) == 0:
                job_log(job_id, "warning", "dedup", "No listings to process - website may have changed or be blocking")

            # PHASE 3: Save to database
            job_log(job_id, "info", "saving", f"Saving {len(unique_listings)} listings to database")

            for i, listing_data in enumerate(unique_listings):
                if _job_cancellation_flags.get(job_id):
                    job_log(job_id, "warning", "saving", "Job cancelled by user")
                    break

                try:
                    stats["scraped"] += 1
                    dedup_hash = generate_dedup_hash(
                        listing_data["source_url"],
                        listing_data["address"],
                        listing_data["price"]
                    )

                    existing = await db.pending_approvals.find_one({"dedup_hash": dedup_hash})
                    if existing:
                        stats["duplicates"] += 1
                        job_log(job_id, "debug", "saving", f"Skipping duplicate: {listing_data['title'][:35]}...")
                        continue

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
                        "source_id": listing_data["source_id"],
                        "title": listing_data["title"],
                        "description": listing_data["description"],
                        "price": listing_data["price"],
                        "address": listing_data["address"],
                        "size": listing_data["size"],
                        "images": listing_data["images"],
                        "room_type": "Single" if listing_data["size"] < 35 else "Double",
                        "building_type": "Apartment",
                        "rent_for_only": ["Open to All"],
                        "max_tenants": 2,
                        "data_quality": {
                            "completeness": calculate_completeness(listing_data),
                            "confidence": 0.7,
                            "has_images": len(listing_data["images"]) > 0,
                            "image_count": len(listing_data["images"]),
                        },
                    }

                    await db.pending_approvals.insert_one(pending_doc)
                    stats["saved"] += 1

                    job_log(job_id, "info", "saving", f"Saved listing {i+1}/{len(unique_listings)}", {
                        "title": listing_data["title"][:40],
                        "price": listing_data["price"],
                        "progress": f"{stats['saved']}/{len(unique_listings)}"
                    })

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

            # PHASE 4: Complete
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


def calculate_completeness(listing: dict) -> float:
    """Calculate data completeness score (0-1)."""
    fields = ["title", "description", "price", "address", "size", "images"]
    filled = sum(1 for f in fields if listing.get(f))
    return filled / len(fields)

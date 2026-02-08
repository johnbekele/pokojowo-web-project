# Pokojowo Scraper - AI Context File

## Project Overview

This is a **web scraper** for Polish rental listing sites (OLX.pl, Otodom.pl) that feeds data into the Pokojowo rental platform. It has a **standalone admin dashboard** for managing scrape jobs and approving listings.

## Architecture

```
pokojowo-scraper/
├── src/                    # Python backend (FastAPI)
│   ├── api/
│   │   ├── app.py         # Main FastAPI app
│   │   └── routes/
│   │       ├── jobs.py           # Scrape job management + scraping logic
│   │       ├── pending_listings.py  # Pending approval queue
│   │       ├── approval.py       # Approve/reject actions
│   │       └── stats.py          # Dashboard statistics
│   └── config/
│       └── settings.py    # Environment config
├── admin/                  # React frontend (Vite + Tailwind)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.jsx      # Main dashboard
│   │   │   ├── JobsPanel.jsx      # Job management
│   │   │   ├── LiveJobLogs.jsx    # Real-time log viewer (SSE)
│   │   │   ├── ApprovalQueue.jsx  # Listing approval UI
│   │   │   └── ...
│   │   └── services/
│   │       └── api.js     # API client
│   └── vite.config.js     # Proxy to backend
└── venv/                   # Python virtual environment
```

## Running the Project

### Backend (Port 8001)
```bash
cd /Users/yohansbekele/pokojowo-web-project/pokojowo-scraper
source venv/bin/activate
uvicorn src.api.app:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend (Port 5174)
```bash
cd /Users/yohansbekele/pokojowo-web-project/pokojowo-scraper/admin
npm run dev
```

### Access
- **Admin Dashboard**: http://localhost:5174
- **API Health**: http://localhost:8001/api/scraper/health

## Key Features Implemented

### 1. Scraping Engine (`jobs.py`)
- **OLX scraper**: Extracts from search results (detail pages are blocked)
- **Otodom scraper**: Extracts from search results with region-based URLs
- **Rate limiting**: 2 seconds between pages
- **Deduplication**: MD5 hash of URL + address + price
- **Background execution**: Jobs run async via FastAPI BackgroundTasks

### 2. Live Logging System
- **`job_log()`** function pushes logs to in-memory buffer
- **SSE endpoint** (`/jobs/{id}/stream`) for real-time streaming
- **Logs endpoint** (`/jobs/{id}/logs`) for fetching stored logs
- **Frontend component** (`LiveJobLogs.jsx`) shows terminal-style viewer

### 3. Approval Workflow
- Scraped listings go to `pending_approvals` collection (status: "pending")
- Admin can approve/reject individually or in bulk
- Stats track pending/approved/rejected counts

## Database (MongoDB)

Collections:
- `scrape_jobs` - Job metadata and stats
- `pending_approvals` - Scraped listings awaiting review

Key fields in `pending_approvals`:
```json
{
  "dedup_hash": "md5...",
  "job_id": "olx-warszawa-20260208...",
  "status": "pending|approved|rejected",
  "source_url": "https://...",
  "source_site": "olx|otodom",
  "title": "...",
  "price": 2500.0,
  "address": "Warszawa, Mokotów",
  "size": 40.0,
  "images": ["url1", "url2"],
  "data_quality": { "completeness": 0.8, "confidence": 0.7 }
}
```

## API Endpoints

### Jobs
- `GET /api/scraper/jobs` - List jobs
- `POST /api/scraper/jobs` - Create job `{site, city, max_listings}`
- `GET /api/scraper/jobs/{id}` - Get job details
- `DELETE /api/scraper/jobs/{id}` - Cancel job
- `GET /api/scraper/jobs/{id}/logs` - Get job logs
- `GET /api/scraper/jobs/{id}/stream` - SSE log stream

### Pending Listings
- `GET /api/scraper/pending` - List pending listings
- `GET /api/scraper/pending/queue-stats` - Queue statistics
- `GET /api/scraper/pending/{id}` - Get listing
- `PUT /api/scraper/pending/{id}` - Update listing

### Approval
- `POST /api/scraper/approval/{id}` - Approve/reject single
- `POST /api/scraper/approval/bulk` - Bulk approve/reject

### Stats
- `GET /api/scraper/stats/overview` - Overall stats
- `GET /api/scraper/stats/by-site` - Stats by site
- `GET /api/scraper/stats/recent-activity` - Recent activity

## Supported Cities

OLX: `warszawa`, `krakow`, `wroclaw`, `poznan`, `gdansk`, `szczecin`, `lodz`, `katowice`

Otodom uses region paths:
```python
OTODOM_CITY_PATHS = {
    "warszawa": "mazowieckie/warszawa/warszawa/warszawa",
    "krakow": "malopolskie/krakow/krakow/krakow",
    # ... etc
}
```

## Known Issues / Notes

1. **OLX blocks detail pages** - We extract from search results only (limited data)
2. **Otodom URL format** - Uses `{region}/{city}/{city}/{city}` path structure
3. **CAPTCHA detection** - Checks for `g-recaptcha`, `data-sitekey`, etc.
4. **Images** - Only thumbnail from search results (not full gallery)

## Environment Variables

In `src/config/settings.py`:
- `SCRAPER_MONGODB_URL` - MongoDB connection string
- `SCRAPER_DATABASE_NAME` - Database name (default: "pokojowo_scraper")

## Future Improvements

- [ ] Add Gumtree scraper
- [ ] Playwright/Selenium for JS-rendered pages
- [ ] AI-powered data enrichment (Claude API for description translation)
- [ ] Automated scheduling (cron jobs)
- [ ] Publish approved listings to main Pokojowo backend

## Related Projects

- **pokojowo-frontend** - Main React app (port 5173)
- **pokojowo-backend** - Main API on Render (https://pokojowo-web-project.onrender.com)

This scraper is completely separate from the main app and runs independently.

# Pokojowo Scraper

AI-powered rental listing scraper for Pokojowo platform. Aggregates rental listings from Polish websites (OLX.pl, Otodom.pl, Gumtree.pl) and publishes them to Pokojowo with bilingual (English + Polish) descriptions.

## Features

- **Claude AI-powered**: Uses Claude for autonomous scraping decisions, translation, and classification
- **Multi-site support**: Scrapes OLX.pl, Otodom.pl, and Gumtree.pl
- **Bilingual translation**: Automatically translates Polish listings to English
- **Smart classification**: Automatically classifies room types, building types, and target tenants
- **Deduplication**: Prevents duplicate listings using hash-based tracking
- **Source attribution**: All scraped listings include links back to the original source
- **CLI interface**: Easy-to-use command-line interface
- **Dashboard API**: FastAPI-based REST API for dashboard integration
- **Manual Approval Workflow**: Review and approve listings before publishing
- **Data Quality Metrics**: Track completeness and confidence of scraped data
- **Docker support**: Ready for containerized deployment

## Installation

### Prerequisites

- Python 3.10+
- MongoDB (for deduplication tracking)
- Anthropic API key
- Pokojowo API account with landlord permissions

### Setup

1. Clone the repository:
```bash
cd pokojowo-scraper
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Install Playwright browsers (optional, for JS-heavy sites):
```bash
playwright install chromium
```

5. Configure environment variables:
```bash
cp config/.env.example .env
# Edit .env with your credentials
```

## Configuration

Create a `.env` file with the following variables:

```env
# Anthropic API
ANTHROPIC_API_KEY=sk-ant-...

# Pokojowo API
POKOJOWO_API_URL=http://localhost:3000
POKOJOWO_EMAIL=scraper@pokojowo.com
POKOJOWO_PASSWORD=your_password

# MongoDB for scraper database
SCRAPER_MONGODB_URL=mongodb://localhost:27017
SCRAPER_DATABASE_NAME=pokojowo_scraper

# Optional: Rate limits (requests per minute)
RATE_LIMIT_OLX=30
RATE_LIMIT_OTODOM=20
RATE_LIMIT_GUMTREE=25
```

## Usage

### Basic Scraping

```bash
# Scrape OLX listings from Warsaw (default)
pokojowo-scraper scrape

# Scrape specific site and city
pokojowo-scraper scrape --site olx --city warszawa --max 50

# Scrape from Otodom in Krakow
pokojowo-scraper scrape --site otodom --city krakow --max 100

# Scrape all sites
pokojowo-scraper scrape --site all --city warszawa

# Dry run (no publishing)
pokojowo-scraper scrape --site olx --city warszawa --dry-run
```

### Check Status

```bash
# Show recent jobs
pokojowo-scraper status

# Check specific job
pokojowo-scraper status job-id-here
```

### Test Authentication

```bash
pokojowo-scraper test-auth
```

### View Statistics

```bash
pokojowo-scraper stats
```

### Clear Old Records

```bash
pokojowo-scraper clear-cache --days 90
```

### Dashboard API Server

```bash
# Start the dashboard API server
pokojowo-scraper serve --port 8001

# With auto-reload for development
pokojowo-scraper serve --port 8001 --reload
```

The API will be available at `http://localhost:8001` with interactive docs at `http://localhost:8001/docs`.

## Dashboard Features

The scraper includes a web dashboard for monitoring and managing scraped listings:

### Approval Workflow

All scraped listings go through a manual approval queue before being published to Pokojowo:

1. **Pending**: Newly scraped listings awaiting review
2. **Review**: Admin reviews listing details, translations, and classifications
3. **Edit**: Optionally modify price, descriptions, room type, etc.
4. **Approve/Reject**: Approved listings are published; rejected are discarded

### Dashboard Panels

- **Overview**: Real-time statistics, activity feed, quality metrics
- **Approval Queue**: Grid of pending listings with bulk actions
- **Jobs**: Create/monitor scraping jobs
- **Settings**: Rate limits, scheduling, auto-approval rules

### Data Quality Indicators

Each listing shows quality metrics:
- Image count and availability
- Size/rooms data completeness
- Translation confidence (AI-generated)
- Classification confidence (room type, building type)

### API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/scraper/stats/overview` | Overall statistics |
| `GET /api/scraper/pending` | List pending approvals |
| `POST /api/scraper/approval/{id}` | Approve/reject listing |
| `PUT /api/scraper/pending/{id}` | Update listing data |
| `POST /api/scraper/jobs` | Create scraping job |
| `GET /api/scraper/jobs` | List all jobs |

## Supported Cities

- Warszawa
- Kraków
- Wrocław
- Poznań
- Gdańsk
- Łódź
- Szczecin
- Katowice
- Lublin
- Białystok

## Architecture

```
pokojowo-scraper/
├── src/
│   ├── agents/           # Claude AI agents
│   │   ├── scraper_agent.py
│   │   ├── translation_agent.py
│   │   └── tools/        # Agent tools
│   ├── api/              # Dashboard REST API
│   │   ├── app.py        # FastAPI application
│   │   └── routes/       # API endpoints
│   │       ├── jobs.py
│   │       ├── pending_listings.py
│   │       ├── stats.py
│   │       └── approval.py
│   ├── scrapers/         # Site-specific scrapers
│   │   ├── base_scraper.py
│   │   ├── olx_scraper.py
│   │   ├── otodom_scraper.py
│   │   └── gumtree_scraper.py
│   ├── services/         # Core services
│   │   ├── pokojowo_client.py
│   │   ├── translation_service.py
│   │   ├── image_service.py
│   │   └── deduplication_service.py
│   ├── models/           # Pydantic models
│   ├── db/               # Database repositories
│   ├── config/           # Configuration
│   └── cli/              # CLI interface
```

## Data Flow

### With Manual Approval (Recommended)

```
1. Dashboard/API triggers scrape job
2. Scraper fetches listing URLs from search pages
3. For each listing:
   - Check if already scraped (deduplication)
   - Extract raw data (title, description, price, images)
   - Translate description (Polish → English) using Claude
   - Classify room type and building type
   - Calculate data quality metrics
   - Save to pending_approvals queue
4. Admin reviews listings in Dashboard
   - View original vs processed data
   - Edit translations, classifications, prices
   - Check data quality indicators
5. On approval:
   - Download and upload images to Pokojowo
   - Create listing via Pokojowo API with source attribution
   - Mark as published
```

### Direct Publishing (CLI dry_run=false)

1. CLI/Scheduler triggers scrape job
2. Scraper fetches listing URLs from search pages
3. For each listing:
   - Check if already scraped (deduplication)
   - Extract raw data (title, description, price, images)
   - Translate description (Polish → English)
   - Classify room type and building type
   - Download and upload images to Pokojowo
   - Create listing via Pokojowo API
   - Store source URL for attribution

## Docker Deployment

```bash
# Build and run with docker-compose
cd docker
docker-compose up -d

# Run a scrape manually
docker-compose run scraper scrape --site olx --city warszawa

# Check logs
docker-compose logs -f scraper
```

## Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=src

# Run specific test file
pytest tests/test_models.py
```

## License

MIT

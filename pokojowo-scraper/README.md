# Pokojowo Scraper v2

Local-first scraper for Polish rental listings (OLX.pl, Otodom.pl) feeding the
Pokojowo platform. Runs on a schedule on macOS, extracts structured data
deterministically (embedded page JSON — no cloud AI), translates Polish→English
with a local Ollama model, geocodes and verifies nearby POIs via OpenStreetMap,
scores every listing's quality, auto-publishes the good ones through the main
backend's `/api/listings/import`, and queues the rest for review in the admin
dashboard.

**Zero API cost. No cloud LLM. No fabricated data** — a missing field stays
missing and lowers the listing's quality score instead of being silently
defaulted.

## Architecture

```
harvest (search pages, newest-first, stop-on-seen)
  → fetch detail (curl_cffi Chrome impersonation, 3–6s jitter)
  → extract   [structured: Otodom __NEXT_DATA__ / OLX __PRERENDERED_STATE__ · confidence 1.0]
  → rules     [Polish regex: kaucja, czynsz, piętro, umeblowane, od zaraz · 0.85]
  → geocode   [Nominatim + permanent cache; precision: exact→street→district→city]
  → POIs      [Overpass around coords, geohash-cached → closeTo]
  → LLM gaps  [local Ollama JSON: roomType, rentForOnly, maxTenants · 0.7]
  → translate [local Ollama pl→en, lingua-validated, content-hash cached]
  → score     [weighted completeness × provenance confidence + hard gates]
  → route     [≥0.85 + gates pass → auto-publish · ≥0.60 → queue · else → held]
```

Fetcher failures that are likely transient (network errors, HTTP 429, and HTTP
5xx) are retried with bounded exponential backoff. HTTP 403 challenges and
permanent 4xx responses are not retried. Each run records fetch attempts,
retries, successful fetches, extracted records, and records passing quality;
the dashboard log emits an error when extraction falls below the configured
minimum sample threshold and success-rate threshold.

Publishing goes through `POST /api/listings/import` (X-Scraper-Key auth,
idempotent on sourceUrl). Images are downloaded, downscaled to ≤1600px JPEG,
and re-hosted via `POST /api/upload/scraped` — no hotlinking.

## Setup (macOS, Apple Silicon)

```bash
cd pokojowo-scraper

# 1. Python env
uv venv --python 3.12 .venv-v2
uv pip install --python .venv-v2/bin/python -e ".[dev]"

# 2. Local LLM
brew install ollama          # or download the app
ollama pull gemma3:12b-it-qat   # ~9 GB, stays loaded between runs

# 3. Config
cp .env.example .env
# set SCRAPER_POKOJOWO_API_KEY to the same value as SCRAPER_API_KEY
# in pokojowo-fastapi/.env (the import endpoint fails closed without it)

# 4. MongoDB — the scraper uses its own DB (pokojowo_scraper) on the same
# local mongod as the main app.
```

The dashboard API fails closed unless both dashboard keys are configured. Put
the same values in the admin UI's environment as `VITE_SCRAPER_DASHBOARD_KEY`
and `VITE_SCRAPER_DASHBOARD_ADMIN_KEY`; the admin key is required for starting
runs and approving, rejecting, editing, or annotating listings. Keep the API
bound to localhost unless it is deployed behind an authenticated proxy:

```bash
uvicorn pokojowo_scraper.api.app:app --host 127.0.0.1 --port 8001
```

## First run

```bash
source .venv-v2/bin/activate

# Save real fixture pages + smoke-test extraction (MUST run from a
# residential IP — datacenter IPs get blocked):
pokojowo-scraper probe otodom --city warszawa
pokojowo-scraper probe olx --city warszawa

# Check an extractor against a saved page:
pokojowo-scraper extract otodom tests/fixtures/otodom/detail_warszawa_0.html

# Full pipeline, nothing saved/published:
pokojowo-scraper run --site otodom --city warszawa --pages 1 --dry-run

# Real run:
pokojowo-scraper run

# Spot-check translation quality on scraped descriptions:
pokojowo-scraper translate-test --count 20
```

### Refreshing extractor fixtures

When OLX or Otodom changes its page structure, capture fresh real pages before
changing an extractor:

```bash
pokojowo-scraper probe olx --city warszawa
pokojowo-scraper probe otodom --city warszawa
pytest tests/test_real_fixtures.py
```

Review the expected values in `tests/test_real_fixtures.py` when replacing a
fixture. Keep the fixture-backed assertions specific so a markup change cannot
silently produce a partially populated listing.

## Scheduling (launchd)

launchd is used instead of cron because it runs missed schedules after wake.

```bash
# Edit the paths in both plists first (they point at this repo + .venv-v2)
cp deploy/com.pokojowo.scraper.plist ~/Library/LaunchAgents/
cp deploy/com.pokojowo.dashboard.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.pokojowo.scraper.plist
launchctl load ~/Library/LaunchAgents/com.pokojowo.dashboard.plist

# Fire a run immediately to test:
launchctl kickstart -k gui/$(id -u)/com.pokojowo.scraper
tail -f /tmp/pokojowo-scraper.log
```

Default schedule: 07:40, 13:10, 20:20. Steady-state runs are cheap — pagination
stops after 8 consecutive already-seen listings.

## Admin dashboard

```bash
# API (or use the launchd plist above)
uvicorn pokojowo_scraper.api.app:app --port 8001

# UI
cd admin && npm install && npm run dev   # http://localhost:5174
```

Pages: **Runs** (history + live SSE logs + manual trigger), **Queue**
(edit-before-approve, reject with reason), **Annotations** (tag issues:
wrong-district, bad-translation, …), **Metrics** (quality distribution,
per-site/per-field precision from your annotations).

## Tests

```bash
pytest            # fixture-based extractor tests, rules, quality, payload
```

## Troubleshooting

- **BlockedError / site marked blocked in run record** — you're rate-limited or
  on a flagged IP. Wait a few hours; check you're not on VPN/datacenter IP.
  The run record and dashboard show which site was blocked.
- **Translation empty / suspect flags everywhere** — is Ollama running?
  `curl localhost:11434/api/tags` should list `gemma3:12b-it-qat`.
- **Publish 401** — key mismatch between `SCRAPER_POKOJOWO_API_KEY` (scraper)
  and `SCRAPER_API_KEY` (backend .env).
- **Extractor returns None on OLX** — page structure changed. Re-run
  `pokojowo-scraper probe olx`, inspect the saved HTML for
  `__PRERENDERED_STATE__`, adjust `sites/olx.py` paths, extend the tests.

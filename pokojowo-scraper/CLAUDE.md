# Pokojowo Scraper v2 - AI Context File

## Overview

Local-first scraper for OLX.pl and Otodom.pl rental listings, feeding the main
Pokojowo backend. Runs scheduled on the user's MacBook (M4). Zero cloud-AI
cost: extraction is deterministic (embedded page JSON), translation and
classification fallback use local Ollama (`gemma3:12b-it-qat`).

Core principles:
- **No fabricated defaults.** A missing field stays `None` and lowers the
  quality score. (v1 defaulted size to 40m² and hardcoded confidence 0.95.)
- **Provenance everywhere.** Every field is a `FieldValue{value, source,
  confidence}` — source ∈ structured(1.0) / regex(0.85) / llm(0.7) /
  geocode(0.8) / overpass(0.9) / manual(1.0).
- **Publish via the backend API**, never direct Mongo writes:
  `POST /api/listings/import` + `POST /api/upload/scraped` (image re-host),
  both authed with the `X-Scraper-Key` header (`SCRAPER_API_KEY` in backend env).

## Layout

```
src/pokojowo_scraper/
  config.py          # pydantic-settings, env prefix SCRAPER_
  schemas.py         # FieldValue, ExtractedListing, QualityScore, RunStats
  store.py           # Mongo (db pokojowo_scraper): runs, pending, seen_listings,
                     # annotations, geocode_cache, poi_cache, translations
  fetch/client.py    # curl_cffi Chrome impersonation, jittered delays, BlockedError
  sites/otodom.py    # __NEXT_DATA__ props.pageProps.ad → everything incl. coords
  sites/olx.py       # __PRERENDERED_STATE__ → JSON-LD → CSS fallback chain
  enrich/rules.py    # Polish regex: kaucja, czynsz, piętro, umeblowane, od zaraz
  enrich/translate.py# Ollama pl→en + lingua validation + sha256 cache
  enrich/llm.py      # Ollama JSON fallback: roomType/rentForOnly/maxTenants/...
  enrich/geocode.py  # Nominatim 1rps + permanent cache; GeoPrecision ladder
  enrich/poi.py      # Overpass POIs → closeTo, geohash-6 cached
  quality.py         # weighted completeness × provenance; hard gates
  dedupe.py          # content_hash, price_history, cross-site pHash match
  publish.py         # /import payload builder + image re-host
  pipeline.py        # run_all: harvest→extract→enrich→score→route
  cli.py             # probe / extract / run / translate-test
  api/app.py         # dashboard API :8001 (runs, queue, annotate, metrics, SSE)
admin/               # React dashboard :5174 (React Query + router + recharts)
deploy/*.plist       # launchd: scheduled runs + keep-alive dashboard API
tests/               # fixture-based; pytest from repo root with .venv-v2
```

## Routing policy

`quality.confidence ≥ 0.85` **and** no failed gates → auto-publish;
`≥ 0.60` → approval queue; below → held. Gates: required import fields,
translation validated, geo precision ≥ street, price in per-city band, ≥1 image.

## Key invariants / gotchas

- Enrichment layers must never overwrite a value from a higher-confidence
  source — check `is None` before filling.
- Backend enums must be spelled exactly (`Single|Double|Suite`,
  `Apartment|Loft|Block|Detached_House`, `owner|agency|unknown`) — the backend
  silently coerces invalid values to defaults instead of rejecting.
- `sourceUrl` is the idempotency key end-to-end (seen_listings locally,
  duplicate:true from /import).
- Live scraping only works from a residential IP (the Mac) — the EC2 dev box
  is for code + fixture tests only.
- Incremental runs: pagination stops after `stop_after_seen` (8) consecutive
  known URLs; search results are newest-first.
- OLX `__PRERENDERED_STATE__` JSON paths are best-effort until verified against
  real fixtures from `pokojowo-scraper probe olx` — update sites/olx.py + tests
  if the structure differs.

## Commands

```bash
.venv-v2/bin/pytest                             # run tests
pokojowo-scraper probe <site> --city warszawa   # save fixtures (Mac only)
pokojowo-scraper run --dry-run                  # pipeline without writes
uvicorn pokojowo_scraper.api.app:app --port 8001  # dashboard API
cd admin && npm run dev                          # dashboard UI :5174
```

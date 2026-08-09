"""Central configuration via environment / .env file."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_prefix="SCRAPER_", extra="ignore"
    )

    # Storage
    mongo_uri: str = "mongodb://localhost:27017"
    mongo_db: str = "pokojowo_scraper"

    # Main backend (publish target)
    pokojowo_api_url: str = "http://localhost:3000"
    pokojowo_api_key: str = ""  # sent as X-Scraper-Key to /api/listings/import

    # Dashboard API — fail closed when unset. The admin key is required for
    # actions that mutate data or trigger a scrape run.
    dashboard_api_key: str = ""
    dashboard_admin_key: str = ""
    dashboard_run_cooldown_seconds: int = 60

    # Local LLM (Ollama)
    ollama_url: str = "http://localhost:11434"
    ollama_model: str = "gemma3:12b-it-qat"
    ollama_timeout: float = 120.0

    # Geocoding / POI
    nominatim_url: str = "https://nominatim.openstreetmap.org"
    overpass_url: str = "https://overpass-api.de/api/interpreter"
    geo_user_agent: str = "pokojowo-scraper/2.0 (rental aggregator; contact via repo)"
    # Identify the scraper to site operators and use the same token when
    # evaluating robots.txt rules. Keep this contact URL accurate in deploys.
    scraper_user_agent: str = "PokojowoBot/1.0 (+https://pokojowo.pl/contact)"

    # Scrape targets & politeness
    cities: list[str] = ["warszawa", "krakow", "wroclaw", "poznan", "gdansk", "lodz"]
    page_cap: int = 5  # max search pages per site+city per run
    req_delay_min: float = 3.0
    req_delay_max: float = 6.0
    stop_after_seen: int = 8  # consecutive already-seen URLs that end pagination
    fetch_max_attempts: int = 3
    fetch_backoff_base: float = 1.0
    fetch_backoff_max: float = 30.0
    extraction_alert_min_samples: int = 5
    extraction_alert_threshold: float = 0.25
    revalidation_limit: int = 100

    # Quality routing
    auto_publish_threshold: float = 0.85
    queue_threshold: float = 0.60

    # Caching
    html_cache_dir: Path | None = None  # set during development to save fixtures
    translation_cache: bool = True

    # Images
    max_images: int = 10
    image_max_px: int = 1600


settings = Settings()

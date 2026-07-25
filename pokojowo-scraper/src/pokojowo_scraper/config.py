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

    # Local LLM (Ollama)
    ollama_url: str = "http://localhost:11434"
    ollama_model: str = "gemma3:12b-it-qat"
    ollama_timeout: float = 120.0

    # Geocoding / POI
    nominatim_url: str = "https://nominatim.openstreetmap.org"
    overpass_url: str = "https://overpass-api.de/api/interpreter"
    geo_user_agent: str = "pokojowo-scraper/2.0 (rental aggregator; contact via repo)"

    # Scrape targets & politeness
    cities: list[str] = ["warszawa", "krakow", "wroclaw", "poznan", "gdansk", "lodz"]
    page_cap: int = 5  # max search pages per site+city per run
    req_delay_min: float = 3.0
    req_delay_max: float = 6.0
    stop_after_seen: int = 8  # consecutive already-seen URLs that end pagination

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

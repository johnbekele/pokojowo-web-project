"""Application settings using Pydantic Settings."""

from functools import lru_cache
from pathlib import Path
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Get the project root (pokojowo-scraper directory)
_PROJECT_ROOT = Path(__file__).parent.parent.parent
_ENV_FILE = _PROJECT_ROOT / ".env"


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE) if _ENV_FILE.exists() else None,
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Anthropic API
    anthropic_api_key: str = Field(
        default="", description="Anthropic API key for Claude (required for scraping)"
    )

    # Pokojowo API
    pokojowo_api_url: str = Field(
        default="http://localhost:3000", description="Pokojowo FastAPI base URL"
    )
    pokojowo_email: str = Field(
        default="", description="Scraper account email (required for publishing)"
    )
    pokojowo_password: str = Field(
        default="", description="Scraper account password (required for publishing)"
    )

    # Scraper MongoDB
    scraper_mongodb_url: str = Field(
        default="mongodb://localhost:27017", description="MongoDB connection URL"
    )
    scraper_database_name: str = Field(
        default="pokojowo_scraper", description="Database name for scraper data"
    )

    # Rate Limiting (requests per minute)
    rate_limit_olx: int = Field(default=30, description="Rate limit for OLX")
    rate_limit_otodom: int = Field(default=20, description="Rate limit for Otodom")
    rate_limit_gumtree: int = Field(default=25, description="Rate limit for Gumtree")

    # Proxy Configuration
    use_proxies: bool = Field(default=False, description="Enable proxy rotation")
    proxy_file: str = Field(default="config/proxies.txt", description="Path to proxy list")

    # Logging
    log_level: str = Field(default="INFO", description="Logging level")

    # Scheduling
    schedule_enabled: bool = Field(default=False, description="Enable scheduled scraping")
    schedule_cron: str = Field(default="0 6 * * *", description="Cron expression for scheduler")

    # Claude Model
    claude_model: str = Field(
        default="claude-sonnet-4-5-20250929", description="Claude model to use for agents"
    )

    # Scraping Settings
    max_listings_per_run: int = Field(
        default=100, description="Maximum listings to scrape per run"
    )
    headless_browser: bool = Field(default=True, description="Run browser in headless mode")
    request_timeout: int = Field(default=30, description="HTTP request timeout in seconds")

    @property
    def rate_limits(self) -> dict[str, int]:
        """Get rate limits per site."""
        return {
            "olx": self.rate_limit_olx,
            "otodom": self.rate_limit_otodom,
            "gumtree": self.rate_limit_gumtree,
        }

    def get_proxies(self) -> list[str]:
        """Load proxies from file."""
        if not self.use_proxies:
            return []

        proxy_path = Path(self.proxy_file)
        if not proxy_path.exists():
            return []

        proxies = []
        with open(proxy_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    proxies.append(line)
        return proxies


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()

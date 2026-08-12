from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Optional, Union
from functools import lru_cache


class Settings(BaseSettings):
    # App settings
    APP_NAME: str = "Pokojowo API"
    APP_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    DEBUG: bool = False

    # Error tracking is opt-in. Keeping the DSN unset makes local development
    # and tests completely no-op while production can enable Sentry through
    # environment variables without changing the image.
    SENTRY_DSN: Optional[str] = None
    SENTRY_ENVIRONMENT: Optional[str] = None
    SENTRY_RELEASE: Optional[str] = None
    SENTRY_TRACES_SAMPLE_RATE: float = 0.0

    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 3000

    # Database (accepts both MONGODB_URL and MONGODB_URI)
    MONGODB_URL: str = None
    DATABASE_NAME: str = "test"

    @field_validator('MONGODB_URL', mode='before')
    @classmethod
    def get_mongodb_url(cls, v, values):
        # Accept either MONGODB_URL or MONGODB_URI from environment
        import os
        if v is None:
            return os.getenv('MONGODB_URI', os.getenv('MONGODB_URL', ''))
        return v

    # Security (accepts SECRET_KEY or ACCESS_TOKEN_SECRET)
    SECRET_KEY: str = None
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours for development
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    @field_validator('SECRET_KEY', mode='before')
    @classmethod
    def get_secret_key(cls, v, values):
        import os
        if v is None:
            v = os.getenv('ACCESS_TOKEN_SECRET', os.getenv('SECRET_KEY'))
        debug = os.getenv('DEBUG', '').lower() in ('1', 'true', 'yes')
        if not v or v in ('default-secret-key', 'your-secret-key-here-change-this-in-production'):
            if debug:
                # Local development only — never reachable with DEBUG off
                return 'insecure-dev-only-secret'
            raise ValueError(
                "SECRET_KEY (or ACCESS_TOKEN_SECRET) must be set to a strong "
                "value when DEBUG is off. Refusing to start with a default secret."
            )
        return v

    # CORS - Accept either string or list
    CORS_ORIGINS: Union[str, List[str]] = "http://localhost:5173,http://127.0.0.1:5173,http://frontend:5173"

    @field_validator('CORS_ORIGINS', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        import os
        # Also check environment variable directly as backup
        env_cors = os.getenv('CORS_ORIGINS', '')
        if env_cors:
            v = env_cors

        if isinstance(v, str):
            # Remove any quotes that might be around the value
            v = v.strip().strip('"').strip("'")
            origins = [origin.strip() for origin in v.split(',') if origin.strip()]
            return origins
        elif isinstance(v, list):
            return v
        return ["http://localhost:5173"]

    # Shared secret the scraper must present (X-Scraper-Key header)
    # to use POST /api/listings/import
    SCRAPER_API_KEY: Optional[str] = None

    # Shared secret for chat microservice internal API calls (X-Internal-Key header)
    INTERNAL_API_KEY: Optional[str] = None

    # Chat microservice URL (used by admin stats)
    CHAT_SERVICE_URL: str = "http://localhost:8002"

    # Twilio Verify (phone verification). When unset, a dev fallback
    # logs the OTP to the server log instead of sending SMS.
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_VERIFY_SERVICE_SID: Optional[str] = None

    # Google OAuth
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: Optional[str] = None

    # Apple Sign In
    # TODO: set APPLE_CLIENT_ID to the iOS bundle id (e.g. "com.pokojowo.app").
    # This is the audience the native identity token is validated against.
    # Requires "Sign in with Apple" enabled on the App ID in the Apple Developer
    # portal. No client secret is needed for verifying native identity tokens.
    APPLE_CLIENT_ID: Optional[str] = None

    # Frontend URL for OAuth redirects
    FRONTEND_URL: str = "http://localhost:5173"

    # Email settings
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    EMAIL_FROM: Optional[str] = None

    # File upload
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS: Union[str, List[str]] = "jpg,jpeg,png,gif,webp"

    @field_validator('ALLOWED_EXTENSIONS', mode='after')
    @classmethod
    def parse_allowed_extensions(cls, v):
        if isinstance(v, str):
            return [ext.strip() for ext in v.split(',') if ext.strip()]
        elif isinstance(v, list):
            return v
        return []

    # S3-backed uploads. In prod the backend must have valid AWS credentials
    # (EC2 instance profile) and S3_UPLOADS_BUCKET must be set to the Pulumi
    # `uploads_bucket` output. When DEBUG=True and the bucket is unset the
    # app boots without S3 so `pytest` / local dev don't require AWS.
    AWS_REGION: str = "us-east-1"
    S3_UPLOADS_BUCKET: Optional[str] = None
    # Optional — e.g. "https://d1234abcd.cloudfront.net". When set, clients
    # can turn the relative URLs the API returns (`/uploads/...`) into
    # absolute URLs without going through the API's origin. Not required
    # because the same CloudFront distribution already fronts both /api/*
    # and /uploads/* so relative URLs continue to work.
    PUBLIC_CDN_BASE_URL: Optional[str] = None
    # Seconds a private (verification doc) presigned GET stays valid.
    PRIVATE_URL_TTL_SECONDS: int = 300

    @field_validator('S3_UPLOADS_BUCKET', mode='after')
    @classmethod
    def require_bucket_in_prod(cls, v):
        import os
        debug = os.getenv('DEBUG', '').lower() in ('1', 'true', 'yes')
        if not v and not debug:
            raise ValueError(
                "S3_UPLOADS_BUCKET must be set when DEBUG is off. It should "
                "match the Pulumi `uploads_bucket` output."
            )
        return v

    # Nominatim forward geocoding (map pins for listings and preferred areas).
    # The public instance caps us at 1 req/s and requires a contactable
    # User-Agent; point NOMINATIM_URL at a self-hosted instance to lift that.
    NOMINATIM_URL: str = "https://nominatim.openstreetmap.org"
    NOMINATIM_USER_AGENT: str = "pokojowo-api/1.0 (contact@pokojowo.pl)"
    NOMINATIM_COUNTRY_CODES: str = "pl"
    NOMINATIM_TIMEOUT_SECONDS: int = 20

    # Google AI (accepts both GOOGLE_AI_API_KEY and GOOGLE_GENAI_API_KEY)
    GOOGLE_AI_API_KEY: Optional[str] = None

    @field_validator('GOOGLE_AI_API_KEY', mode='before')
    @classmethod
    def get_google_ai_key(cls, v, values):
        import os
        if v is None:
            return os.getenv('GOOGLE_GENAI_API_KEY', os.getenv('GOOGLE_AI_API_KEY'))
        return v

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # Ignore extra fields from .env


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

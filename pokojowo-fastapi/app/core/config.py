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
            return os.getenv('ACCESS_TOKEN_SECRET', os.getenv('SECRET_KEY', 'default-secret-key'))
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

    # Google OAuth
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: Optional[str] = None

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

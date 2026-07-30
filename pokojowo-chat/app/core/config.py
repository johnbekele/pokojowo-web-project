from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Union
from functools import lru_cache


class Settings(BaseSettings):
    APP_NAME: str = "Pokojowo Chat API"
    APP_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    DEBUG: bool = False

    HOST: str = "0.0.0.0"
    PORT: int = 8002

    MONGODB_URL: str = None
    DATABASE_NAME: str = "pokojowo_chat"

    @field_validator("MONGODB_URL", mode="before")
    @classmethod
    def get_mongodb_url(cls, v):
        import os
        if v is None:
            return os.getenv("MONGODB_URI", os.getenv("MONGODB_URL", ""))
        return v

    SECRET_KEY: str = None
    ALGORITHM: str = "HS256"

    @field_validator("SECRET_KEY", mode="before")
    @classmethod
    def get_secret_key(cls, v):
        import os
        if v is None:
            v = os.getenv("ACCESS_TOKEN_SECRET", os.getenv("SECRET_KEY"))
        debug = os.getenv("DEBUG", "").lower() in ("1", "true", "yes")
        if not v or v in ("default-secret-key", "your-secret-key-here-change-this-in-production"):
            if debug:
                return "insecure-dev-only-secret"
            raise ValueError("SECRET_KEY must be set when DEBUG is off.")
        return v

    CORS_ORIGINS: Union[str, List[str]] = (
        "http://localhost:5173,http://127.0.0.1:5173,"
        "http://localhost:3000,http://127.0.0.1:3000,"
        "http://frontend:3000"
    )

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        import os
        env_cors = os.getenv("CORS_ORIGINS", "")
        if env_cors:
            v = env_cors
        if isinstance(v, str):
            v = v.strip().strip('"').strip("'")
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        if isinstance(v, list):
            return v
        return ["http://localhost:5173"]

    MAIN_API_URL: str = "http://localhost:8000"
    INTERNAL_API_KEY: str = "dev-internal-key"

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

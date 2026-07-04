from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    APP_NAME: str = "TaskManager SaaS"
    SECRET_KEY: str = "euXIwHeTIz8KJKRXO3U6WN5DL3o4YWnYQsiL1PiMmPD"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    DATABASE_URL: str = "postgresql+asyncpg://postgres:Shubham%409178@postgres:5432/taskmanager"
    REDIS_URL: str = "redis://redis:6379/0"
    CACHE_TTL: int = 300

    class Config:
        env_file = ".env"


def get_allowed_origins() -> List[str]:
    """Read ALLOWED_ORIGINS as plain comma-separated string — no JSON parsing."""
    origins_env = os.getenv("ALLOWED_ORIGINS", "")
    default = [
        "http://localhost",
        "http://localhost:80",
        "http://localhost:3000",
        "http://127.0.0.1",
        "https://taskmanager-frontend-akbz.onrender.com",
        "https://taskmanager-backend-qljw.onrender.com",
    ]
    if origins_env:
        extras = [o.strip() for o in origins_env.split(",") if o.strip()]
        return default + extras
    return default


settings = Settings()
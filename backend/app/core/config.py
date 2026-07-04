from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    APP_NAME: str = "TaskManager SaaS"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "euXIwHeTIz8KJKRXO3U6WN5DL3o4YWnYQsiL1PiMmPD")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://postgres:Shubham%409178@postgres:5432/taskmanager"
    )

    REDIS_URL: str = os.getenv("REDIS_URL", "redis://redis:6379/0")
    CACHE_TTL: int = 300

    ALLOWED_ORIGINS: List[str] = [
        "http://localhost",
        "http://localhost:80",
        "http://localhost:3000",
        "http://127.0.0.1",
        "http://frontend:3000",
        "http://nginx:80",
    ]

    class Config:
        env_file = ".env"


settings = Settings()

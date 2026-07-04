
import os


class Settings:
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

    @property
    def allowed_origins(self):
        defaults = [
            "http://localhost",
            "http://localhost:80",
            "http://localhost:3000",
            "http://127.0.0.1",
            "https://taskmanager-frontend-akbz.onrender.com",
            "https://taskmanager-backend-qljw.onrender.com",
        ]
        extra = os.getenv("EXTRA_ORIGINS", "")
        if extra:
            defaults += [o.strip() for o in extra.split(",") if o.strip()]
        return defaults


settings = Settings()
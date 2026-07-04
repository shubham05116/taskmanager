import json
import logging
from typing import Optional, Any
import redis.asyncio as aioredis
from app.core.config import settings

logger = logging.getLogger(__name__)


class RedisClient:
    def __init__(self):
        self._client: Optional[aioredis.Redis] = None

    async def connect(self):
        try:
            self._client = aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
            )
            await self._client.ping()
            logger.info("Redis connected.")
        except Exception as e:
            logger.warning(f"Redis unavailable: {e}. Caching disabled.")
            self._client = None

    async def disconnect(self):
        if self._client:
            await self._client.aclose()

    async def get(self, key: str) -> Optional[Any]:
        if not self._client:
            return None
        try:
            value = await self._client.get(key)
            return json.loads(value) if value else None
        except Exception:
            return None

    async def set(self, key: str, value: Any, ttl: int = None) -> bool:
        if not self._client:
            return False
        try:
            await self._client.set(key, json.dumps(value, default=str), ex=ttl or settings.CACHE_TTL)
            return True
        except Exception:
            return False

    async def delete(self, key: str) -> bool:
        if not self._client:
            return False
        try:
            await self._client.delete(key)
            return True
        except Exception:
            return False

    async def delete_pattern(self, pattern: str):
        if not self._client:
            return
        try:
            keys = await self._client.keys(pattern)
            if keys:
                await self._client.delete(*keys)
        except Exception:
            pass

    async def publish(self, channel: str, message: Any):
        if not self._client:
            return
        try:
            await self._client.publish(channel, json.dumps(message, default=str))
        except Exception:
            pass


redis_client = RedisClient()

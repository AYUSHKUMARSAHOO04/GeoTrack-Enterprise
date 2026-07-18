import json
from typing import Any

import redis.asyncio as redis

from app.core.config import settings

_REDIS_DECODE_KWARGS: dict[str, Any] = {"decode_responses": True}


class RedisService:
    _client: redis.Redis | None = None

    @classmethod
    def get_client(cls) -> redis.Redis:
        if cls._client is None:
            cls._client = redis.from_url(  # type: ignore[no-untyped-call]
                settings.REDIS_URL, **_REDIS_DECODE_KWARGS
            )
        return cls._client

    @classmethod
    async def publish(cls, channel: str, data: dict[str, Any]) -> None:
        client = cls.get_client()
        await client.publish(channel, json.dumps(data, default=str))

    @classmethod
    async def close(cls) -> None:
        if cls._client is not None:
            await cls._client.aclose()
            cls._client = None


class RedisChannels:
    LOCATION_UPDATED = "location.updated"
    DEVICE_ONLINE = "device.online"
    DEVICE_OFFLINE = "device.offline"
    TRIP_STARTED = "trip.started"
    TRIP_ENDED = "trip.ended"

import asyncio
import contextlib
import json
from typing import Any

import redis.asyncio as redis
from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from app.core.auth import verify_supabase_jwt
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.redis import RedisChannels
from app.models import Profile

router = APIRouter()

HEARTBEAT_INTERVAL = 30
PRESENCE_TIMEOUT = 90


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: dict[str, list[tuple[WebSocket, str]]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, org_id: str, user_id: str) -> None:
        await websocket.accept()
        async with self._lock:
            if org_id not in self._connections:
                self._connections[org_id] = []
            self._connections[org_id].append((websocket, user_id))

    async def disconnect(self, websocket: WebSocket, org_id: str) -> None:
        async with self._lock:
            if org_id in self._connections:
                self._connections[org_id] = [
                    (ws, uid) for ws, uid in self._connections[org_id] if ws != websocket
                ]
                if not self._connections[org_id]:
                    del self._connections[org_id]

    async def broadcast_to_org(self, org_id: str, message: dict[str, Any]) -> None:
        async with self._lock:
            conns = list(self._connections.get(org_id, []))
        for ws, _ in conns:
            with contextlib.suppress(Exception):
                await ws.send_json(message)

    async def get_org_viewer_count(self, org_id: str) -> int:
        async with self._lock:
            return len(self._connections.get(org_id, []))


manager = ConnectionManager()


async def _verify_ws_token(token: str) -> tuple[str, str]:
    from fastapi import HTTPException, status
    from fastapi.security import HTTPAuthorizationCredentials

    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    payload = await verify_supabase_jwt(creds)
    user_id: str | None = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Profile).where(Profile.id == user_id, Profile.is_active.is_(True))
        )
        profile = result.scalar_one_or_none()
        if not profile or not profile.organization_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Profile not found")
        return user_id, profile.organization_id


async def _redis_listener(org_id: str) -> None:
    client = redis.from_url(settings.REDIS_URL, decode_responses=True)  # type: ignore[no-untyped-call]
    pubsub = client.pubsub()
    await pubsub.subscribe(
        RedisChannels.LOCATION_UPDATED,
        RedisChannels.DEVICE_ONLINE,
        RedisChannels.DEVICE_OFFLINE,
        RedisChannels.TRIP_STARTED,
        RedisChannels.TRIP_ENDED,
        RedisChannels.GEOFENCE_ENTER,
        RedisChannels.GEOFENCE_EXIT,
        RedisChannels.GEOFENCE_DWELL,
        RedisChannels.ALERT_TRIGGERED,
        RedisChannels.ALERT_ACKNOWLEDGED,
        RedisChannels.ALERT_RESOLVED,
        RedisChannels.NOTIFICATION_CREATED,
    )
    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                data = json.loads(message["data"])
                msg_org_id = data.get("organization_id")
                if msg_org_id == org_id:
                    await manager.broadcast_to_org(
                        org_id,
                        {
                            "type": message["channel"],
                            "data": data,
                        },
                    )
    finally:
        await pubsub.unsubscribe()
        await client.aclose()


@router.websocket("/ws/locations")
async def websocket_locations(
    websocket: WebSocket,
    token: str = Query(...),
) -> None:
    try:
        user_id, org_id = await _verify_ws_token(token)
    except Exception:
        await websocket.close(code=1008)
        return

    await manager.connect(websocket, org_id, user_id)
    listener_task = asyncio.create_task(_redis_listener(org_id))

    try:
        while True:
            try:
                msg = await asyncio.wait_for(
                    websocket.receive_text(), timeout=HEARTBEAT_INTERVAL + 10
                )
                if msg == "ping":
                    await websocket.send_json({"type": "pong"})
            except TimeoutError:
                await websocket.send_json({"type": "heartbeat"})
    except WebSocketDisconnect:
        pass
    finally:
        listener_task.cancel()
        await manager.disconnect(websocket, org_id)
        with contextlib.suppress(asyncio.CancelledError):
            await listener_task

from fastapi import APIRouter

from app.api.v1.audit_logs import router as audit_logs_router
from app.api.v1.device_credentials import router as credentials_router
from app.api.v1.devices import router as devices_router
from app.api.v1.health import router as health_router
from app.api.v1.locations import router as locations_router
from app.api.v1.me import router as me_router
from app.api.v1.organizations import router as org_router
from app.api.v1.teams import router as teams_router
from app.api.v1.websocket import router as ws_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["health"])
api_router.include_router(me_router, tags=["profile"])
api_router.include_router(org_router, tags=["organizations"])
api_router.include_router(teams_router, tags=["teams"])
api_router.include_router(devices_router, tags=["devices"])
api_router.include_router(credentials_router, tags=["device-credentials"])
api_router.include_router(locations_router, tags=["locations"])
api_router.include_router(audit_logs_router, tags=["audit-logs"])
api_router.include_router(ws_router, tags=["websocket"])

from fastapi import APIRouter

from app.api.v1.audit_logs import router as audit_logs_router
from app.api.v1.devices import router as devices_router
from app.api.v1.health import router as health_router
from app.api.v1.me import router as me_router
from app.api.v1.organizations import router as org_router
from app.api.v1.teams import router as teams_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["health"])
api_router.include_router(me_router, tags=["profile"])
api_router.include_router(org_router, tags=["organizations"])
api_router.include_router(teams_router, tags=["teams"])
api_router.include_router(devices_router, tags=["devices"])
api_router.include_router(audit_logs_router, tags=["audit-logs"])

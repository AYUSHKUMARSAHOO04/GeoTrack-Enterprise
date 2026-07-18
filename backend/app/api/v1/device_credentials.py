from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rbac import AuthContext, require_permission
from app.schemas import DeviceCredentialCreateResponse, DeviceCredentialResponse
from app.services import DeviceCredentialService

router = APIRouter()


@router.post(
    "/devices/{device_id}/credentials",
    response_model=DeviceCredentialCreateResponse,
    status_code=201,
)
async def issue_credentials(
    device_id: str,
    ctx: AuthContext = Depends(require_permission("devices:update")),
    db: AsyncSession = Depends(get_db),
) -> DeviceCredentialCreateResponse:
    service = DeviceCredentialService(db)
    credential, api_key, secret = await service.issue_credentials(device_id, ctx.organization_id)
    return DeviceCredentialCreateResponse(
        credential=DeviceCredentialResponse.model_validate(credential),
        api_key=api_key,
        secret=secret,
    )


@router.get(
    "/devices/{device_id}/credentials",
    response_model=list[DeviceCredentialResponse],
)
async def list_credentials(
    device_id: str,
    ctx: AuthContext = Depends(require_permission("devices:read")),
    db: AsyncSession = Depends(get_db),
) -> list[DeviceCredentialResponse]:
    service = DeviceCredentialService(db)
    creds = await service.list_credentials(device_id, ctx.organization_id)
    return [DeviceCredentialResponse.model_validate(c) for c in creds]


@router.post(
    "/devices/{device_id}/credentials/regenerate",
    response_model=DeviceCredentialCreateResponse,
)
async def regenerate_credentials(
    device_id: str,
    ctx: AuthContext = Depends(require_permission("devices:update")),
    db: AsyncSession = Depends(get_db),
) -> DeviceCredentialCreateResponse:
    service = DeviceCredentialService(db)
    credential, api_key, secret = await service.regenerate_credentials(
        device_id, ctx.organization_id
    )
    return DeviceCredentialCreateResponse(
        credential=DeviceCredentialResponse.model_validate(credential),
        api_key=api_key,
        secret=secret,
    )


@router.post("/credentials/{credential_id}/suspend", status_code=204)
async def suspend_credential(
    credential_id: str,
    ctx: AuthContext = Depends(require_permission("devices:update")),
    db: AsyncSession = Depends(get_db),
) -> None:
    service = DeviceCredentialService(db)
    await service.suspend_credential(credential_id, ctx.organization_id)


@router.post("/credentials/{credential_id}/revoke", status_code=204)
async def revoke_credential(
    credential_id: str,
    ctx: AuthContext = Depends(require_permission("devices:update")),
    db: AsyncSession = Depends(get_db),
) -> None:
    service = DeviceCredentialService(db)
    await service.revoke_credential(credential_id, ctx.organization_id)

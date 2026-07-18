from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Device
from app.repositories import DeviceCredentialRepository, DeviceRepository


async def authenticate_device(
    api_key: str,
    secret: str,
    db: AsyncSession,
) -> Device:
    cred_repo = DeviceCredentialRepository(db)
    device_repo = DeviceRepository(db)

    credential = await cred_repo.get_by_api_key(api_key)
    if not credential:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid device API key",
        )

    if not await cred_repo.verify_secret(credential, secret):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid device secret",
        )

    device = await device_repo.get_by_id(credential.device_id, credential.device_id)
    if not device or device.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Device not found or retired",
        )

    if device.status == "suspended":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Device is suspended",
        )

    await cred_repo.touch_last_used(credential)
    return device

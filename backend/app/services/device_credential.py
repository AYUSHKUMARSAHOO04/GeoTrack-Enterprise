from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import DeviceCredential
from app.repositories import DeviceCredentialRepository, DeviceRepository


class DeviceCredentialService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.cred_repo = DeviceCredentialRepository(db)
        self.device_repo = DeviceRepository(db)

    async def issue_credentials(
        self, device_id: str, org_id: str
    ) -> tuple[DeviceCredential, str, str]:
        from app.repositories.device_credential import generate_api_key, generate_device_secret

        device = await self.device_repo.get_by_id(device_id, org_id)
        if not device:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")

        api_key = generate_api_key()
        secret = generate_device_secret()
        credential = await self.cred_repo.create(device_id, api_key, secret)
        return credential, api_key, secret

    async def list_credentials(self, device_id: str, org_id: str) -> list[DeviceCredential]:
        device = await self.device_repo.get_by_id(device_id, org_id)
        if not device:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
        return await self.cred_repo.list_by_device(device_id)

    async def suspend_credential(self, credential_id: str, org_id: str) -> None:
        from sqlalchemy import select

        result = await self.db.execute(
            select(DeviceCredential).where(DeviceCredential.id == credential_id)
        )
        credential = result.scalar_one_or_none()
        if not credential:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Credential not found"
            )
        device = await self.device_repo.get_by_id(credential.device_id, org_id)
        if not device:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
        await self.cred_repo.update_status(credential, "suspended")

    async def revoke_credential(self, credential_id: str, org_id: str) -> None:
        from sqlalchemy import select

        result = await self.db.execute(
            select(DeviceCredential).where(DeviceCredential.id == credential_id)
        )
        credential = result.scalar_one_or_none()
        if not credential:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Credential not found"
            )
        device = await self.device_repo.get_by_id(credential.device_id, org_id)
        if not device:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
        await self.cred_repo.update_status(credential, "revoked")

    async def regenerate_credentials(
        self, device_id: str, org_id: str
    ) -> tuple[DeviceCredential, str, str]:
        device = await self.device_repo.get_by_id(device_id, org_id)
        if not device:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
        await self.cred_repo.revoke_all_for_device(device_id)
        return await self.issue_credentials(device_id, org_id)

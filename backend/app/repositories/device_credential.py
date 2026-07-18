import hashlib
import secrets

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import DeviceCredential


def hash_secret(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def generate_api_key() -> str:
    return f"gtk_{secrets.token_urlsafe(32)}"


def generate_device_secret() -> str:
    return secrets.token_urlsafe(48)


class DeviceCredentialRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, device_id: str, api_key: str, secret: str) -> DeviceCredential:
        cred = DeviceCredential(
            device_id=device_id,
            api_key_hash=hash_secret(api_key),
            api_key_prefix=api_key[:8],
            secret_hash=hash_secret(secret),
            status="active",
        )
        self.db.add(cred)
        await self.db.flush()
        return cred

    async def get_by_api_key(self, api_key: str) -> DeviceCredential | None:
        key_hash = hash_secret(api_key)
        result = await self.db.execute(
            select(DeviceCredential).where(
                DeviceCredential.api_key_hash == key_hash,
                DeviceCredential.status == "active",
            )
        )
        return result.scalar_one_or_none()

    async def verify_secret(self, credential: DeviceCredential, secret: str) -> bool:
        return credential.secret_hash == hash_secret(secret)

    async def list_by_device(self, device_id: str) -> list[DeviceCredential]:
        result = await self.db.execute(
            select(DeviceCredential)
            .where(DeviceCredential.device_id == device_id)
            .order_by(DeviceCredential.issued_at.desc())
        )
        return list(result.scalars().all())

    async def update_status(self, credential: DeviceCredential, status: str) -> DeviceCredential:
        credential.status = status
        await self.db.flush()
        return credential

    async def touch_last_used(self, credential: DeviceCredential) -> None:
        from sqlalchemy import func

        credential.last_used_at = func.now()
        await self.db.flush()

    async def revoke_all_for_device(self, device_id: str) -> None:
        result = await self.db.execute(
            select(DeviceCredential).where(
                DeviceCredential.device_id == device_id,
                DeviceCredential.status == "active",
            )
        )
        for cred in result.scalars().all():
            cred.status = "revoked"
        await self.db.flush()

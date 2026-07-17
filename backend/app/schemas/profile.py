from pydantic import BaseModel, ConfigDict


class OrganizationBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    slug: str
    plan: str


class MeResponse(BaseModel):
    id: str
    email: str
    first_name: str
    last_name: str
    role: str
    organization: OrganizationBrief | None
    permissions: list[str]


class ProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    first_name: str
    last_name: str
    role: str
    is_active: bool


class ProfileUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    avatar_url: str | None = None

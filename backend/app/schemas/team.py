from datetime import datetime

from pydantic import BaseModel, ConfigDict


class TeamCreate(BaseModel):
    name: str
    description: str | None = None


class TeamUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class TeamResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    name: str
    description: str | None
    created_at: datetime
    updated_at: datetime


class TeamMemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    team_id: str
    user_id: str
    role: str
    created_at: datetime
    email: str | None = None
    first_name: str | None = None
    last_name: str | None = None


class AddMemberRequest(BaseModel):
    user_id: str
    role: str = "member"

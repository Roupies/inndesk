from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, ConfigDict


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: Literal["admin", "receptionist"]


class UserUpdate(BaseModel):
    full_name: str | None = None
    role: Literal["admin", "receptionist"] | None = None
    is_active: bool | None = None


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime
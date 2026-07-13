import re
from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, EmailStr, ConfigDict, ValidationInfo, field_validator


def validate_password_strength(value: str) -> str:
    if len(value) < 8:
        raise ValueError('Le mot de passe doit contenir au moins 8 caractères')
    if not re.search(r'\d', value):
        raise ValueError('Le mot de passe doit contenir au moins un chiffre')
    if not re.search(r'[A-Z]', value):
        raise ValueError('Le mot de passe doit contenir au moins une lettre majuscule')
    return value


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: Literal["admin", "receptionist"] = "receptionist"
    is_active: bool = True

    @field_validator('password')
    @classmethod
    def validate_password(cls, value: str) -> str:
        return validate_password_strength(value)


class UserUpdate(BaseModel):
    full_name: str | None = None
    email: EmailStr | None = None
    role: Literal["admin", "receptionist"] | None = None
    is_active: bool | None = None


class UserProfileUpdate(BaseModel):
    full_name: str
    email: EmailStr


class UserResetPassword(BaseModel):
    new_password: str

    @field_validator('new_password')
    @classmethod
    def validate_password(cls, value: str) -> str:
        return validate_password_strength(value)


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str

    @field_validator('new_password')
    @classmethod
    def validate_password(cls, value: str) -> str:
        return validate_password_strength(value)

    @field_validator('confirm_password')
    @classmethod
    def passwords_match(cls, value: str, info: ValidationInfo) -> str:
        new_password = info.data.get('new_password')
        if new_password is not None and value != new_password:
            raise ValueError('Les mots de passe ne correspondent pas')
        return value


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime

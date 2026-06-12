from typing import Optional
from pydantic import BaseModel, field_validator
from datetime import time


class HotelSettingsBase(BaseModel):
    hotel_name: str
    hotel_address: str
    hotel_city: str
    hotel_zip: str
    hotel_country: str = "France"
    hotel_phone: str
    hotel_email: str
    hotel_siret: str
    tva_rate: float = 10.0
    check_in_time: str = "14:00"
    check_out_time: str = "11:00"
    currency: str = "EUR"

    @field_validator('tva_rate')
    @classmethod
    def validate_tva_rate(cls, v):
        if v < 0 or v > 100:
            raise ValueError('Le taux de TVA doit être entre 0 et 100')
        return v

    @field_validator('check_in_time', 'check_out_time')
    @classmethod
    def validate_time_format(cls, v):
        try:
            time.fromisoformat(v)
        except ValueError:
            raise ValueError('Format d\'heure invalide. Utilisez HH:MM')
        return v


class HotelSettingsResponse(HotelSettingsBase):
    pass


class HotelSettingsUpdate(HotelSettingsBase):
    pass


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str

    @field_validator('new_password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Le mot de passe doit contenir au moins 8 caractères')
        return v

    @field_validator('confirm_password')
    @classmethod
    def passwords_match(cls, v, values):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Les mots de passe ne correspondent pas')
        return v


class UserProfileUpdate(BaseModel):
    full_name: str
    email: str


class UserCreate(BaseModel):
    full_name: str
    email: str
    password: str
    role: str = "receptionist"
    is_active: bool = True

    @field_validator('role')
    @classmethod
    def validate_role(cls, v):
        if v not in ['admin', 'receptionist']:
            raise ValueError('Le rôle doit être admin ou receptionist')
        return v

    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Le mot de passe doit contenir au moins 8 caractères')
        return v


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

    @field_validator('role')
    @classmethod
    def validate_role(cls, v):
        if v is not None and v not in ['admin', 'receptionist']:
            raise ValueError('Le rôle doit être admin ou receptionist')
        return v


class UserResetPassword(BaseModel):
    new_password: str

    @field_validator('new_password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Le mot de passe doit contenir au moins 8 caractères')
        return v


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    role: str
    is_active: bool
    created_at: str

    class Config:
        from_attributes = True
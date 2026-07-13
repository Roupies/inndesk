from pydantic import BaseModel, field_validator
from datetime import time

from backend.schemas.user import (
    PasswordChangeRequest,
    UserCreate,
    UserProfileUpdate,
    UserResetPassword,
    UserResponse,
    UserUpdate,
)


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

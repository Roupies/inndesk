from typing import Dict
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.core.security import require_admin, get_current_user
from backend.models.hotel_setting import HotelSetting
from backend.models.user import User
from backend.schemas.settings import HotelSettingsResponse, HotelSettingsUpdate

router = APIRouter(prefix="/settings", tags=["Settings"])

# Default hotel settings
DEFAULT_HOTEL_SETTINGS = {
    "hotel_name": "InnDesk Hôtel",
    "hotel_address": "123 Rue de la Paix",
    "hotel_city": "Paris",
    "hotel_zip": "75001",
    "hotel_country": "France",
    "hotel_phone": "01 23 45 67 89",
    "hotel_email": "contact@inndesk-hotel.fr",
    "hotel_siret": "12345678901234",
    "tva_rate": "10.0",
    "check_in_time": "14:00",
    "check_out_time": "11:00",
    "currency": "EUR"
}


def get_setting_value(db: Session, key: str) -> str:
    """Get a single setting value, return default if not found."""
    setting = db.query(HotelSetting).filter(HotelSetting.key == key).first()
    if setting:
        return setting.value
    return DEFAULT_HOTEL_SETTINGS.get(key, "")


def set_setting_value(db: Session, key: str, value: str):
    """Set or update a setting value."""
    setting = db.query(HotelSetting).filter(HotelSetting.key == key).first()
    if setting:
        setting.value = value
    else:
        setting = HotelSetting(key=key, value=value)
        db.add(setting)


@router.get("/hotel", response_model=HotelSettingsResponse)
def get_hotel_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all hotel settings."""
    settings_dict = {}
    
    # Get all settings from database
    settings = db.query(HotelSetting).all()
    settings_map = {setting.key: setting.value for setting in settings}
    
    # Build response with defaults for missing values
    for key, default_value in DEFAULT_HOTEL_SETTINGS.items():
        settings_dict[key] = settings_map.get(key, default_value)
    
    # Convert string values to appropriate types
    settings_dict["tva_rate"] = float(settings_dict["tva_rate"])
    
    return HotelSettingsResponse(**settings_dict)


@router.put("/hotel", response_model=HotelSettingsResponse)
def update_hotel_settings(
    settings: HotelSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update hotel settings (admin only)."""
    try:
        # Convert to dict and handle types
        settings_dict = settings.model_dump()
        
        # Update each setting
        for key, value in settings_dict.items():
            # Convert numeric values to strings for storage
            if key == "tva_rate":
                value = str(float(value))
            else:
                value = str(value)
            
            set_setting_value(db, key, value)
        
        db.commit()
        
        # Return updated settings
        return get_hotel_settings(db, current_user)
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la mise à jour des paramètres: {str(e)}"
        )
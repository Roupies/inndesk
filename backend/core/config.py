from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_HOURS: int = 8
    APP_NAME: str = "InnDesk"
    
    # Hotel settings for invoices
    HOTEL_NAME: str = "Hôtel de la Paix"
    HOTEL_ADDRESS: str = "12 Rue de Rivoli, 75001 Paris"
    HOTEL_SIRET: str = "123 456 789 00012"
    HOTEL_EMAIL: str = "contact@hotel-de-la-paix.fr"
    HOTEL_PHONE: str = "+33 1 42 00 00 00"
    
    # Email settings
    RESEND_API_KEY: str = "your_resend_api_key_here"
    RESEND_FROM_EMAIL: str = "factures@hotel-de-la-paix.fr"

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings():
    return Settings()

# For backward compatibility
settings = get_settings()
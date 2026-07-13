from sqlalchemy import Column, Integer, String, Float, Boolean, TIMESTAMP, text
from backend.core.database import Base


class HotelSetting(Base):
    __tablename__ = "hotel_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False, index=True)
    value = Column(String(500), nullable=False)
    created_at = Column(
        TIMESTAMP(timezone=True), 
        server_default=text("NOW()"),
        nullable=False
    )
    updated_at = Column(
        TIMESTAMP(timezone=True), 
        server_default=text("NOW()"),
        onupdate=text("NOW()"),
        nullable=False
    )
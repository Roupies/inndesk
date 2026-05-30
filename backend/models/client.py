from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.sql import func

from backend.core.database import Base


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(30))
    nationality = Column(String(100))
    id_document = Column(String(100))
    gdpr_consent = Column(Boolean, nullable=False, default=False)
    gdpr_consent_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<Client(id={self.id}, last_name='{self.last_name}')>"
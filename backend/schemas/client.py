from datetime import datetime

from pydantic import BaseModel, EmailStr, ConfigDict


class ClientCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr | None = None
    phone: str | None = None
    nationality: str | None = None
    id_document: str | None = None
    gdpr_consent: bool
    notes: str | None = None


class ClientUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    nationality: str | None = None
    id_document: str | None = None
    notes: str | None = None


class ClientResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    first_name: str
    last_name: str
    email: str | None
    phone: str | None
    nationality: str | None
    id_document: str | None
    gdpr_consent: bool
    gdpr_consent_at: datetime | None
    created_at: datetime
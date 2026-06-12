from datetime import datetime

from pydantic import BaseModel, EmailStr, ConfigDict


class ClientCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr | None = None
    phone: str | None = None
    nationality: str | None = None
    id_document: str | None = None


class ClientUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    nationality: str | None = None
    id_document: str | None = None


class ClientListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    first_name: str
    last_name: str
    email: str | None
    phone: str | None
    nationality: str | None
    created_at: datetime


class ClientDetailResponse(ClientListResponse):
    id_document: str | None


# Keep for backward compatibility
ClientResponse = ClientDetailResponse
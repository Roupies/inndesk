from datetime import datetime

from typing import Annotated

from pydantic import BaseModel, EmailStr, ConfigDict, Field, field_validator


Name = Annotated[str, Field(min_length=1, max_length=100)]
OptionalName = Annotated[str, Field(min_length=1, max_length=100)] | None
OptionalEmail = Annotated[EmailStr, Field(max_length=254)] | None
OptionalPhone = Annotated[str, Field(max_length=30)] | None
OptionalNationality = Annotated[str, Field(max_length=100)] | None
OptionalIdDocument = Annotated[str, Field(max_length=100)] | None


class ClientCreate(BaseModel):
    first_name: Name
    last_name: Name
    email: OptionalEmail = None
    phone: OptionalPhone = None
    nationality: OptionalNationality = None
    id_document: OptionalIdDocument = None
    consent_marketing: bool = False


class ClientUpdate(BaseModel):
    first_name: OptionalName = None
    last_name: OptionalName = None
    email: OptionalEmail = None
    phone: OptionalPhone = None
    nationality: OptionalNationality = None
    id_document: OptionalIdDocument = None
    consent_marketing: bool | None = None

    @field_validator('consent_marketing')
    @classmethod
    def consent_cannot_be_null(cls, value: bool | None) -> bool:
        if value is None:
            raise ValueError('Le consentement marketing doit être vrai ou faux')
        return value


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
    consent_marketing: bool
    consent_marketing_at: datetime | None
    anonymized_at: datetime | None


# Keep for backward compatibility
ClientResponse = ClientDetailResponse

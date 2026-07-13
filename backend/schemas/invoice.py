from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict


class InvoiceCreate(BaseModel):
    reservation_id: int
    payment_status: Literal["pending", "paid"] | None = "pending"
    payment_method: Literal["TPE", "espèces", "visa", "mastercard", "amex", "chèques vacances", "virement"] | None = "TPE"


class InvoiceUpdate(BaseModel):
    payment_status: Literal["pending", "paid"] | None = None
    payment_method: Literal["TPE", "espèces", "visa", "mastercard", "amex", "chèques vacances", "virement"] | None = None
    paid_at: datetime | None = None
    notes: str | None = None


class InvoiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    reservation_id: int
    nights_count: int
    room_rate: Decimal
    total_amount: Decimal  # HT amount
    tva_rate: Decimal
    tva_amount: Decimal
    total_ttc: Decimal
    payment_method: Literal[
        "TPE", "espèces", "visa", "mastercard", "amex", "chèques vacances", "virement"
    ] | None
    payment_status: str
    paid_at: datetime | None
    notes: str | None
    created_at: datetime


class InvoiceWithReservationResponse(InvoiceResponse):
    # Joined reservation data for display
    client_name: str | None = None
    client_email: str | None = None
    room_number: str | None = None
    room_type_name: str | None = None
    check_in_date: datetime | None = None
    check_out_date: datetime | None = None


class SendInvoiceEmailRequest(BaseModel):
    email: str


class InvoiceListResponse(BaseModel):
    items: list[InvoiceWithReservationResponse]
    total: int
    limit: int
    offset: int


class InvoiceStatsResponse(BaseModel):
    total_invoices: int
    total_paid_amount: Decimal
    pending_count: int
    recovery_rate: float  # percentage of paid vs total
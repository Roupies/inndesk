from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict


class InvoiceCreate(BaseModel):
    reservation_id: int
    nights_count: int
    room_rate: Decimal
    total_amount: Decimal
    payment_method: str = "TPE"
    payment_status: str = "pending"
    notes: str | None = None


class InvoiceUpdate(BaseModel):
    nights_count: int | None = None
    room_rate: Decimal | None = None
    total_amount: Decimal | None = None
    payment_method: str | None = None
    payment_status: Literal["pending", "paid"] | None = None
    notes: str | None = None


class InvoiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    reservation_id: int
    nights_count: int
    room_rate: Decimal
    total_amount: Decimal
    payment_method: str
    payment_status: str
    paid_at: datetime | None
    notes: str | None
    created_at: datetime
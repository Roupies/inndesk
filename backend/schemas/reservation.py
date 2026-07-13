from datetime import datetime, date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict

from .client import ClientResponse
from .room import RoomResponse
from .room_type import RoomTypeResponse


class ReservationCreate(BaseModel):
    client_id: int
    room_type_id: int | None = None
    room_id: int | None = None
    check_in_date: date
    check_out_date: date
    adults: int = 1
    children: int = 0
    status: Literal["confirmed", "checked_in", "checked_out", "cancelled", "no_show"] = "confirmed"
    notes: str | None = None


class ReservationUpdate(BaseModel):
    client_id: int | None = None
    room_type_id: int | None = None
    room_id: int | None = None
    check_in_date: date | None = None
    check_out_date: date | None = None
    adults: int | None = None
    children: int | None = None
    status: Literal["confirmed", "checked_in", "checked_out", "cancelled", "no_show"] | None = None
    notes: str | None = None


class ReservationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    client_id: int
    room_type_id: int
    room_id: int | None
    created_by: int
    check_in_date: date
    check_out_date: date
    adults: int
    children: int
    total_amount: Decimal | None
    status: str
    notes: str | None
    created_at: datetime
    updated_at: datetime


class ReservationDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    client_id: int
    room_type_id: int
    room_id: int | None
    created_by: int
    check_in_date: date
    check_out_date: date
    adults: int
    children: int
    total_amount: Decimal | None
    status: str
    notes: str | None
    created_at: datetime
    updated_at: datetime
    client: ClientResponse
    room_type: RoomTypeResponse
    room: RoomResponse | None


class AssignRoomRequest(BaseModel):
    room_id: int
from typing import Literal

from pydantic import BaseModel, ConfigDict

from .room_type import RoomTypeResponse


class RoomCreate(BaseModel):
    number: str
    floor: int
    room_type_id: int
    status: str = "available"
    notes: str | None = None


class RoomUpdate(BaseModel):
    number: str | None = None
    floor: int | None = None
    room_type_id: int | None = None
    status: Literal["available", "occupied", "dirty", "cleaning", "maintenance"] | None = None
    notes: str | None = None


class RoomResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    number: str
    floor: int
    room_type_id: int
    status: str
    notes: str | None


class RoomDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    number: str
    floor: int
    room_type_id: int
    status: str
    notes: str | None
    room_type: RoomTypeResponse
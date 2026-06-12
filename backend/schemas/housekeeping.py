from typing import Literal

from pydantic import BaseModel, ConfigDict


class HousekeepingRoomResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    number: str
    floor: int
    status: str
    notes: str | None
    room_type_name: str


class HousekeepingStatusUpdate(BaseModel):
    status: Literal["available", "dirty", "cleaning", "maintenance"]
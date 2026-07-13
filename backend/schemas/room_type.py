from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class RoomTypeCreate(BaseModel):
    name: str
    description: str | None = None
    price_per_night: Decimal
    max_occupancy: int


class RoomTypeUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    price_per_night: Decimal | None = None
    max_occupancy: int | None = None


class RoomTypeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    price_per_night: Decimal
    max_occupancy: int
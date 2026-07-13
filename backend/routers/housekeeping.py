from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from backend.core.database import get_db
from backend.core.security import get_current_user, require_admin
from backend.models.room import Room
from backend.models.room_type import RoomType
from backend.models.user import User
from backend.schemas.housekeeping import HousekeepingRoomResponse, HousekeepingStatusUpdate

router = APIRouter(prefix="/housekeeping", tags=["Housekeeping"])


@router.get("/", response_model=list[HousekeepingRoomResponse])
def get_housekeeping_rooms(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all rooms with their status for housekeeping management"""
    rooms = (
        db.query(Room)
        .join(RoomType)
        .options(joinedload(Room.room_type))
        .order_by(Room.floor.asc(), Room.number.asc())
        .all()
    )
    
    # Transform to response format
    response = []
    for room in rooms:
        room_data = HousekeepingRoomResponse(
            id=room.id,
            number=room.number,
            floor=room.floor,
            status=room.status,
            notes=room.notes,
            room_type_name=room.room_type.name
        )
        response.append(room_data)
    
    return response


@router.patch("/{room_id}", response_model=HousekeepingRoomResponse)
def update_room_status(
    room_id: int,
    status_data: HousekeepingStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update room status manually"""
    # Get room
    room = (
        db.query(Room)
        .options(joinedload(Room.room_type))
        .filter(Room.id == room_id)
        .first()
    )
    
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chambre non trouvée"
        )
    
    # Admin-only for maintenance status
    if status_data.status == "maintenance" and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Droits administrateur requis pour définir le statut maintenance"
        )
    
    # Update status
    room.status = status_data.status
    db.commit()
    db.refresh(room)
    
    # Return updated room
    return HousekeepingRoomResponse(
        id=room.id,
        number=room.number,
        floor=room.floor,
        status=room.status,
        notes=room.notes,
        room_type_name=room.room_type.name
    )
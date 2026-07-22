from datetime import date as DateType
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from backend.core.database import get_db
from backend.core.security import get_current_user, require_admin
from backend.models.reservation import Reservation
from backend.models.room import Room
from backend.models.room_type import RoomType
from backend.models.user import User
from backend.schemas.room import RoomCreate, RoomDetailResponse, RoomResponse, RoomUpdate

router = APIRouter(prefix="/rooms", tags=["Rooms"])


@router.get("/", response_model=list[RoomDetailResponse])
def get_rooms(
    status: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Room).options(joinedload(Room.room_type))
    
    if status:
        query = query.filter(Room.status == status)
    
    rooms = query.all()
    return rooms


@router.get("/available/", response_model=list[RoomDetailResponse])
def get_available_rooms(
    room_type_id: int = Query(...),
    check_in: DateType = Query(...),
    check_out: DateType = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rooms = db.query(Room).options(joinedload(Room.room_type)).filter(
        Room.room_type_id == room_type_id,
        # Housekeeping statuses describe the room's current condition. They
        # must not prevent a future booking; only maintenance takes a room out
        # of the sellable inventory.
        Room.status != "maintenance"
    ).all()

    available = []
    for room in rooms:
        overlap = db.query(Reservation).filter(
            Reservation.room_id == room.id,
            Reservation.status.in_(["confirmed", "checked_in"]),
            Reservation.check_in_date < check_out,
            Reservation.check_out_date > check_in,
        ).first()
        if not overlap:
            available.append(room)
    return available


@router.get("/{room_id}", response_model=RoomDetailResponse)
def get_room(
    room_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    room = db.query(Room).options(joinedload(Room.room_type)).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chambre non trouvée"
        )
    return room


@router.post("/", status_code=status.HTTP_201_CREATED, response_model=RoomResponse)
def create_room(
    room_data: RoomCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    # Check if room number already exists
    existing_room = db.query(Room).filter(Room.number == room_data.number).first()
    if existing_room:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Une chambre avec ce numéro existe déjà"
        )
    
    # Check if room type exists
    room_type = db.query(RoomType).filter(RoomType.id == room_data.room_type_id).first()
    if not room_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Type de chambre non trouvé"
        )
    
    room = Room(
        number=room_data.number,
        floor=room_data.floor,
        room_type_id=room_data.room_type_id,
        status=room_data.status,
        notes=room_data.notes
    )
    
    db.add(room)
    db.commit()
    db.refresh(room)
    
    return room


@router.patch("/{room_id}", response_model=RoomResponse)
def update_room(
    room_id: int,
    room_data: RoomUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chambre non trouvée"
        )
    
    # Check room number uniqueness if being updated
    if room_data.number is not None and room_data.number != room.number:
        existing_room = db.query(Room).filter(Room.number == room_data.number).first()
        if existing_room:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Une chambre avec ce numéro existe déjà"
            )
    
    # Check room type exists if being updated
    if room_data.room_type_id is not None:
        room_type = db.query(RoomType).filter(RoomType.id == room_data.room_type_id).first()
        if not room_type:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Type de chambre non trouvé"
            )
    
    if room_data.number is not None:
        room.number = room_data.number
    if room_data.floor is not None:
        room.floor = room_data.floor
    if room_data.room_type_id is not None:
        room.room_type_id = room_data.room_type_id
    if room_data.status is not None:
        room.status = room_data.status
    if room_data.notes is not None:
        room.notes = room_data.notes
    
    db.commit()
    db.refresh(room)
    
    return room


@router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_room(
    room_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chambre non trouvée"
        )
    
    # Check if any reservations reference this room
    reservation_count = db.query(Reservation).filter(Reservation.room_id == room_id).count()
    if reservation_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Impossible de supprimer une chambre avec des réservations"
        )
    
    db.delete(room)
    db.commit()

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.core.security import get_current_user, require_admin
from backend.models.room import Room
from backend.models.room_type import RoomType
from backend.models.user import User
from backend.schemas.room_type import RoomTypeCreate, RoomTypeResponse, RoomTypeUpdate

router = APIRouter(prefix="/room-types", tags=["Room Types"])


@router.get("/", response_model=list[RoomTypeResponse])
def get_room_types(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    room_types = db.query(RoomType).all()
    return room_types


@router.get("/{room_type_id}", response_model=RoomTypeResponse)
def get_room_type(
    room_type_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    room_type = db.query(RoomType).filter(RoomType.id == room_type_id).first()
    if not room_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Type de chambre non trouvé"
        )
    return room_type


@router.post("/", status_code=status.HTTP_201_CREATED, response_model=RoomTypeResponse)
def create_room_type(
    room_type_data: RoomTypeCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    room_type = RoomType(
        name=room_type_data.name,
        description=room_type_data.description,
        price_per_night=room_type_data.price_per_night,
        max_occupancy=room_type_data.max_occupancy
    )
    
    db.add(room_type)
    db.commit()
    db.refresh(room_type)
    
    return room_type


@router.patch("/{room_type_id}", response_model=RoomTypeResponse)
def update_room_type(
    room_type_id: int,
    room_type_data: RoomTypeUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    room_type = db.query(RoomType).filter(RoomType.id == room_type_id).first()
    if not room_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Type de chambre non trouvé"
        )
    
    if room_type_data.name is not None:
        room_type.name = room_type_data.name
    if room_type_data.description is not None:
        room_type.description = room_type_data.description
    if room_type_data.price_per_night is not None:
        room_type.price_per_night = room_type_data.price_per_night
    if room_type_data.max_occupancy is not None:
        room_type.max_occupancy = room_type_data.max_occupancy
    
    db.commit()
    db.refresh(room_type)
    
    return room_type


@router.delete("/{room_type_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_room_type(
    room_type_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    room_type = db.query(RoomType).filter(RoomType.id == room_type_id).first()
    if not room_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Type de chambre non trouvé"
        )
    
    # Check if any rooms reference this type
    room_count = db.query(Room).filter(Room.room_type_id == room_type_id).count()
    if room_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Impossible de supprimer un type de chambre utilisé par des chambres"
        )
    
    db.delete(room_type)
    db.commit()
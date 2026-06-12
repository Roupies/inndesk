from datetime import datetime, timezone
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.models.client import Client
from backend.models.invoice import Invoice
from backend.models.reservation import Reservation
from backend.models.room import Room
from backend.models.room_type import RoomType
from backend.models.user import User
from backend.schemas.reservation import AssignRoomRequest, ReservationCreate, ReservationDetailResponse, ReservationResponse, ReservationUpdate

router = APIRouter(prefix="/reservations", tags=["Reservations"])


def find_available_room(
    db: Session,
    room_type_id: int,
    check_in_date,
    check_out_date,
    exclude_reservation_id: int | None = None
):
    """
    Find the first available room of the given type for the date range.
    Returns a Room object, or None if no room is available.
    Overlap condition: existing.check_in < new_check_out AND existing.check_out > new_check_in
    Uses SELECT FOR UPDATE to prevent race conditions.
    """
    rooms = db.query(Room).filter(
        Room.room_type_id == room_type_id,
        Room.status == "available"
    ).with_for_update(skip_locked=True).all()

    for room in rooms:
        query = db.query(Reservation).filter(
            Reservation.room_id == room.id,
            Reservation.status.in_(["confirmed", "checked_in"]),
            Reservation.check_in_date < check_out_date,
            Reservation.check_out_date > check_in_date,
        )
        if exclude_reservation_id:
            query = query.filter(Reservation.id != exclude_reservation_id)
        if query.first() is None:
            return room
    return None


@router.get("/", response_model=list[ReservationDetailResponse])
def get_reservations(
    reservation_status: str | None = Query(default=None),
    room_id: int | None = Query(None),
    client_id: int | None = Query(None),
    start: str | None = Query(None),
    end: str | None = Query(None),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Reservation).options(
        joinedload(Reservation.client),
        joinedload(Reservation.room_type),
        joinedload(Reservation.room)
    )
    
    if reservation_status:
        query = query.filter(Reservation.status == reservation_status)
    if room_id:
        query = query.filter(Reservation.room_id == room_id)
    if client_id:
        query = query.filter(Reservation.client_id == client_id)
    if start:
        query = query.filter(Reservation.check_in_date >= start)
    if end:
        query = query.filter(Reservation.check_out_date <= end)
    
    reservations = query.offset(offset).limit(limit).all()
    return reservations


@router.get("/{reservation_id}", response_model=ReservationDetailResponse)
def get_reservation(
    reservation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    reservation = db.query(Reservation).options(
        joinedload(Reservation.client),
        joinedload(Reservation.room_type),
        joinedload(Reservation.room)
    ).filter(Reservation.id == reservation_id).first()
    
    if not reservation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Réservation non trouvée"
        )
    return reservation


@router.post("/", status_code=status.HTTP_201_CREATED, response_model=ReservationResponse)
def create_reservation(
    reservation_data: ReservationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Validate check-out date is after check-in date
    if reservation_data.check_out_date <= reservation_data.check_in_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La date de départ doit être postérieure à la date d'arrivée"
        )
    
    # Validate client exists
    client = db.query(Client).filter(Client.id == reservation_data.client_id).first()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client non trouvé"
        )
    
    # Determine room_type_id and room_id
    if reservation_data.room_id and not reservation_data.room_type_id:
        # room_id provided but not room_type_id - derive room_type_id from room
        room = db.query(Room).filter(Room.id == reservation_data.room_id).first()
        if not room:
            raise HTTPException(status_code=404, detail="Chambre introuvable")
        room_type_id = room.room_type_id
        assigned_room_id = reservation_data.room_id
    elif reservation_data.room_type_id:
        # room_type_id provided
        room_type_id = reservation_data.room_type_id
        assigned_room_id = reservation_data.room_id
    else:
        # Neither provided
        raise HTTPException(status_code=400, detail="room_type_id ou room_id requis")
    
    # Validate room_type exists
    room_type = db.query(RoomType).filter(RoomType.id == room_type_id).first()
    if not room_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Catégorie de chambre non trouvée"
        )
    
    # Validate adults + children <= max_occupancy
    total_guests = reservation_data.adults + reservation_data.children
    if total_guests > room_type.max_occupancy:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Nombre de personnes dépasse la capacité (max {room_type.max_occupancy})"
        )
    
    # Check room availability if specific room is assigned
    if assigned_room_id:
        # Validate the specific room exists and is of correct type
        room = db.query(Room).filter(Room.id == assigned_room_id).first()
        if not room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chambre non trouvée"
            )
        
        if room.room_type_id != room_type_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cette chambre ne correspond pas à la catégorie réservée"
            )
        
        # Lock the room to prevent race conditions
        locked_room = db.query(Room).filter(Room.id == assigned_room_id).with_for_update(skip_locked=True).first()
        if locked_room is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cette chambre est en cours de réservation"
            )
        
        # Check availability for this specific room
        query = db.query(Reservation).filter(
            Reservation.room_id == assigned_room_id,
            Reservation.status.in_(["confirmed", "checked_in"]),
            Reservation.check_in_date < reservation_data.check_out_date,
            Reservation.check_out_date > reservation_data.check_in_date,
        )
        
        if query.first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cette chambre est déjà réservée pour ces dates"
            )
    else:
        # Find available room of the correct type
        available_room = find_available_room(
            db,
            room_type_id,
            reservation_data.check_in_date,
            reservation_data.check_out_date
        )
        
        if not available_room:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Aucune chambre disponible pour ces dates"
            )
    
    # Calculate total amount
    nights = (reservation_data.check_out_date - reservation_data.check_in_date).days
    total_amount = Decimal(nights) * room_type.price_per_night
    
    # Create reservation
    reservation = Reservation(
        client_id=reservation_data.client_id,
        room_type_id=room_type_id,
        room_id=assigned_room_id,
        created_by=current_user.id,
        check_in_date=reservation_data.check_in_date,
        check_out_date=reservation_data.check_out_date,
        adults=reservation_data.adults,
        children=reservation_data.children,
        total_amount=total_amount,
        status=reservation_data.status,
        notes=reservation_data.notes
    )
    
    db.add(reservation)
    db.commit()
    db.refresh(reservation)
    
    return reservation


@router.post("/{reservation_id}/assign-room", response_model=ReservationResponse)
def assign_room(
    reservation_id: int,
    room_data: AssignRoomRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    room_id = room_data.room_id
    
    # Validate reservation exists
    reservation = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if not reservation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Réservation non trouvée"
        )
    
    # Validate room exists and belongs to correct room_type
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chambre non trouvée"
        )
    
    if room.room_type_id != reservation.room_type_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cette chambre ne correspond pas à la catégorie réservée"
        )
    
    # Check room availability for this specific room
    query = db.query(Reservation).filter(
        Reservation.room_id == room_id,
        Reservation.status.in_(["confirmed", "checked_in"]),
        Reservation.check_in_date < reservation.check_out_date,
        Reservation.check_out_date > reservation.check_in_date,
        Reservation.id != reservation_id
    )
    
    if query.first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cette chambre est déjà réservée pour ces dates"
        )
    
    # Assign room
    reservation.room_id = room_id
    db.commit()
    db.refresh(reservation)
    
    return reservation


@router.patch("/{reservation_id}", response_model=ReservationResponse)
def update_reservation(
    reservation_id: int,
    reservation_data: ReservationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    reservation = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if not reservation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Réservation non trouvée"
        )
    
    # Validate client exists if being updated
    if reservation_data.client_id is not None:
        client = db.query(Client).filter(Client.id == reservation_data.client_id).first()
        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client non trouvé"
            )
    
    # Validate room_type exists if being updated
    if reservation_data.room_type_id is not None:
        room_type = db.query(RoomType).filter(RoomType.id == reservation_data.room_type_id).first()
        if not room_type:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Catégorie de chambre non trouvée"
            )
    
    # Validate room exists if being updated
    if reservation_data.room_id is not None:
        room = db.query(Room).filter(Room.id == reservation_data.room_id).first()
        if not room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chambre non trouvée"
            )
    
    # Check for check-in validation
    if reservation_data.status == "checked_in" and reservation.room_id is None and reservation_data.room_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assignez une chambre avant le check-in"
        )
    
    # Determine final dates for availability check
    final_check_in = reservation_data.check_in_date or reservation.check_in_date
    final_check_out = reservation_data.check_out_date or reservation.check_out_date
    final_room_id = reservation_data.room_id or reservation.room_id
    
    # Validate check-out date is after check-in date
    if final_check_out <= final_check_in:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La date de départ doit être postérieure à la date d'arrivée"
        )
    
    # Check availability if dates or room are being changed and room is assigned
    if (final_room_id is not None and 
        (reservation_data.check_in_date is not None or 
         reservation_data.check_out_date is not None or 
         reservation_data.room_id is not None)):
        
        query = db.query(Reservation).filter(
            Reservation.room_id == final_room_id,
            Reservation.status.in_(["confirmed", "checked_in"]),
            Reservation.check_in_date < final_check_out,
            Reservation.check_out_date > final_check_in,
            Reservation.id != reservation_id
        )
        
        if query.first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cette chambre est déjà réservée pour ces dates"
            )
    
    # Update fields
    if reservation_data.client_id is not None:
        reservation.client_id = reservation_data.client_id
    if reservation_data.room_type_id is not None:
        reservation.room_type_id = reservation_data.room_type_id
    if reservation_data.room_id is not None:
        reservation.room_id = reservation_data.room_id
    if reservation_data.check_in_date is not None:
        reservation.check_in_date = reservation_data.check_in_date
    if reservation_data.check_out_date is not None:
        reservation.check_out_date = reservation_data.check_out_date
    if reservation_data.adults is not None:
        reservation.adults = reservation_data.adults
    if reservation_data.children is not None:
        reservation.children = reservation_data.children
    if reservation_data.status is not None:
        reservation.status = reservation_data.status
    if reservation_data.notes is not None:
        reservation.notes = reservation_data.notes
    
    # Fix updated_at timestamp - onupdate=func.now() doesn't work with attribute assignment
    reservation.updated_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(reservation)
    
    return reservation


@router.delete("/{reservation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reservation(
    reservation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    reservation = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if not reservation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Réservation non trouvée"
        )
    
    existing_invoice = db.query(Invoice).filter(
        Invoice.reservation_id == reservation_id
    ).first()
    if existing_invoice:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Impossible de supprimer une réservation avec une facture associée. Annulez d'abord la facture."
        )
    
    db.delete(reservation)
    db.commit()
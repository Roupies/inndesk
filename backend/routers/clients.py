from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from backend.core.database import get_db
from backend.core.security import get_current_user, require_admin
from backend.models.client import Client
from backend.models.invoice import Invoice
from backend.models.reservation import Reservation
from backend.models.user import User
from backend.schemas.client import ClientCreate, ClientResponse, ClientUpdate, ClientListResponse, ClientDetailResponse
from backend.schemas.reservation import ReservationResponse

router = APIRouter(prefix="/clients", tags=["Clients"])


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


@router.get("/stats")
def get_clients_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    total_clients = db.query(Client).count()
    clients_with_email = db.query(Client).filter(Client.email.isnot(None)).count()
    clients_with_phone = db.query(Client).filter(Client.phone.isnot(None)).count()
    
    # Clients created this month
    current_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    clients_this_month = db.query(Client).filter(
        Client.created_at >= current_month
    ).count()
    
    return {
        "total_clients": total_clients,
        "clients_with_email": clients_with_email,
        "clients_with_phone": clients_with_phone,
        "clients_this_month": clients_this_month
    }


@router.get("/", response_model=list[ClientListResponse])
def get_clients(
    search: str | None = Query(None),
    nationality: str | None = Query(None),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Client)
    
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Client.first_name.ilike(search_pattern)) |
            (Client.last_name.ilike(search_pattern)) |
            (Client.email.ilike(search_pattern)) |
            (Client.phone.ilike(search_pattern))
        )
    
    if nationality:
        query = query.filter(Client.nationality.ilike(f"%{nationality}%"))
    
    clients = query.order_by(Client.created_at.desc()).offset(offset).limit(limit).all()
    return clients


@router.get("/{client_id}", response_model=ClientResponse)
def get_client(
    client_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client non trouvé"
        )
    return client


@router.post("/", status_code=status.HTTP_201_CREATED, response_model=ClientResponse)
def create_client(
    client_data: ClientCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check email uniqueness if provided
    if client_data.email:
        existing_client = db.query(Client).filter(Client.email == client_data.email).first()
        if existing_client:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Un client avec cet email existe déjà"
            )
    
    client = Client(
        first_name=client_data.first_name,
        last_name=client_data.last_name,
        email=client_data.email,
        phone=client_data.phone,
        nationality=client_data.nationality,
        id_document=client_data.id_document,
        consent_marketing=client_data.consent_marketing,
        consent_marketing_at=utc_now() if client_data.consent_marketing else None,
    )
    
    db.add(client)
    db.commit()
    db.refresh(client)
    
    return client


@router.patch("/{client_id}", response_model=ClientResponse)
def update_client(
    client_id: int,
    client_data: ClientUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client non trouvé"
        )
    
    updates = client_data.model_dump(exclude_unset=True)

    # Check email uniqueness if being updated
    if "email" in updates and updates["email"] and updates["email"] != client.email:
        existing_client = db.query(Client).filter(Client.email == client_data.email).first()
        if existing_client:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Un client avec cet email existe déjà"
            )
    
    if client_data.first_name is not None:
        client.first_name = client_data.first_name
    if client_data.last_name is not None:
        client.last_name = client_data.last_name

    for field in ("email", "phone", "nationality", "id_document"):
        if field in updates:
            setattr(client, field, updates[field])

    if "consent_marketing" in updates:
        consent_marketing = updates["consent_marketing"]
        if consent_marketing and not client.consent_marketing:
            client.consent_marketing_at = utc_now()
        elif not consent_marketing:
            client.consent_marketing_at = None
        client.consent_marketing = consent_marketing
    
    db.commit()
    db.refresh(client)
    
    return client


@router.get("/{client_id}/export")
def export_client_data(
    client_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client non trouvé")

    reservations = (
        db.query(Reservation)
        .options(joinedload(Reservation.room), joinedload(Reservation.room_type))
        .filter(Reservation.client_id == client_id)
        .order_by(Reservation.check_in_date.desc())
        .all()
    )
    reservation_ids = [reservation.id for reservation in reservations]
    invoices = []
    if reservation_ids:
        invoices = (
            db.query(Invoice)
            .filter(Invoice.reservation_id.in_(reservation_ids))
            .order_by(Invoice.created_at.desc())
            .all()
        )

    return {
        "generated_at": utc_now(),
        "client": {
            "id": client.id,
            "first_name": client.first_name,
            "last_name": client.last_name,
            "email": client.email,
            "phone": client.phone,
            "nationality": client.nationality,
            "id_document": client.id_document,
            "consent_marketing": client.consent_marketing,
            "consent_marketing_at": client.consent_marketing_at,
            "anonymized_at": client.anonymized_at,
            "created_at": client.created_at,
        },
        "reservations": [
            {
                "id": reservation.id,
                "check_in_date": reservation.check_in_date,
                "check_out_date": reservation.check_out_date,
                "status": reservation.status,
                "adults": reservation.adults,
                "children": reservation.children,
                "room_number": reservation.room.number if reservation.room else None,
                "room_type": reservation.room_type.name if reservation.room_type else None,
                "total_amount": reservation.total_amount,
                "notes": reservation.notes,
            }
            for reservation in reservations
        ],
        "invoices": [
            {
                "id": invoice.id,
                "reservation_id": invoice.reservation_id,
                "total_amount": invoice.total_amount,
                "tva_amount": invoice.tva_amount,
                "total_ttc": invoice.total_ttc,
                "payment_status": invoice.payment_status,
                "payment_method": invoice.payment_method,
                "paid_at": invoice.paid_at,
                "created_at": invoice.created_at,
            }
            for invoice in invoices
        ],
    }


@router.post("/{client_id}/anonymize", response_model=ClientDetailResponse)
def anonymize_client(
    client_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client non trouvé")

    if client.anonymized_at is not None:
        return client

    client.first_name = "Client"
    client.last_name = "Anonymisé"
    client.email = f"anonymized-{client.id}@invalid.local"
    client.phone = None
    client.nationality = None
    client.id_document = None
    client.consent_marketing = False
    client.consent_marketing_at = None
    client.anonymized_at = utc_now()

    db.commit()
    db.refresh(client)
    return client


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client(
    client_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client non trouvé"
        )
    
    # Check if client has any reservations
    reservation_count = db.query(Reservation).filter(Reservation.client_id == client_id).count()
    if reservation_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Impossible de supprimer un client avec des réservations"
        )
    
    db.delete(client)
    db.commit()


@router.get("/{client_id}/reservations", response_model=list[ReservationResponse])
def get_client_reservations(
    client_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # First check if client exists
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client non trouvé"
        )
    
    reservations = db.query(Reservation).filter(
        Reservation.client_id == client_id
    ).order_by(Reservation.check_in_date.desc()).all()
    
    return reservations

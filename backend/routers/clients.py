from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.models.client import Client
from backend.models.reservation import Reservation
from backend.models.user import User
from backend.schemas.client import ClientCreate, ClientResponse, ClientUpdate, ClientListResponse, ClientDetailResponse

router = APIRouter(prefix="/clients", tags=["Clients"])


@router.get("/", response_model=list[ClientListResponse])
def get_clients(
    search: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Client)
    
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Client.first_name.ilike(search_pattern)) |
            (Client.last_name.ilike(search_pattern)) |
            (Client.email.ilike(search_pattern))
        )
    
    clients = query.all()
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
    # Check GDPR consent
    if not client_data.gdpr_consent:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le consentement RGPD est obligatoire pour créer une fiche client"
        )
    
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
        gdpr_consent=client_data.gdpr_consent,
        gdpr_consent_at=datetime.now(timezone.utc)
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
    
    # Check email uniqueness if being updated
    if client_data.email is not None and client_data.email != client.email:
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
    if client_data.email is not None:
        client.email = client_data.email
    if client_data.phone is not None:
        client.phone = client_data.phone
    if client_data.nationality is not None:
        client.nationality = client_data.nationality
    if client_data.id_document is not None:
        client.id_document = client_data.id_document
    
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
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.core.security import get_current_user, require_admin
from backend.models.invoice import Invoice
from backend.models.reservation import Reservation
from backend.models.user import User
from backend.schemas.invoice import InvoiceCreate, InvoiceResponse, InvoiceUpdate

router = APIRouter(prefix="/invoices", tags=["Invoices"])


@router.get("/", response_model=list[InvoiceResponse])
def get_invoices(
    reservation_id: int | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Invoice)
    
    if reservation_id:
        query = query.filter(Invoice.reservation_id == reservation_id)
    
    invoices = query.all()
    return invoices


@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Facture non trouvée"
        )
    return invoice


@router.post("/", status_code=status.HTTP_201_CREATED, response_model=InvoiceResponse)
def create_invoice(
    invoice_data: InvoiceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Validate reservation exists
    reservation = db.query(Reservation).filter(Reservation.id == invoice_data.reservation_id).first()
    if not reservation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Réservation non trouvée"
        )
    
    # Check if invoice already exists for this reservation
    existing_invoice = db.query(Invoice).filter(Invoice.reservation_id == invoice_data.reservation_id).first()
    if existing_invoice:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Une facture existe déjà pour cette réservation"
        )
    
    paid_at = None
    if invoice_data.payment_status == "paid":
        paid_at = datetime.now(timezone.utc)
    
    invoice = Invoice(
        reservation_id=invoice_data.reservation_id,
        nights_count=invoice_data.nights_count,
        room_rate=invoice_data.room_rate,
        total_amount=invoice_data.total_amount,
        payment_method=invoice_data.payment_method,
        payment_status=invoice_data.payment_status,
        paid_at=paid_at,
        notes=invoice_data.notes
    )
    
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    
    return invoice


@router.patch("/{invoice_id}", response_model=InvoiceResponse)
def update_invoice(
    invoice_id: int,
    invoice_data: InvoiceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Facture non trouvée"
        )
    
    # Track if payment status is changing to "paid"
    setting_to_paid = (
        invoice_data.payment_status == "paid" and 
        invoice.payment_status != "paid" and 
        invoice.paid_at is None
    )
    
    if invoice_data.nights_count is not None:
        invoice.nights_count = invoice_data.nights_count
    if invoice_data.room_rate is not None:
        invoice.room_rate = invoice_data.room_rate
    if invoice_data.total_amount is not None:
        invoice.total_amount = invoice_data.total_amount
    if invoice_data.payment_method is not None:
        invoice.payment_method = invoice_data.payment_method
    if invoice_data.payment_status is not None:
        invoice.payment_status = invoice_data.payment_status
        if setting_to_paid:
            invoice.paid_at = datetime.now(timezone.utc)
    if invoice_data.notes is not None:
        invoice.notes = invoice_data.notes
    
    db.commit()
    db.refresh(invoice)
    
    return invoice


@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_invoice(
    invoice_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Facture non trouvée"
        )
    
    db.delete(invoice)
    db.commit()
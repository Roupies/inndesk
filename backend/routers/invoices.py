import io
import base64
import traceback
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import StreamingResponse
from jinja2 import Environment, FileSystemLoader
from sqlalchemy import func, String
from sqlalchemy.orm import Session, joinedload
from weasyprint import HTML, CSS

from backend.core.config import get_settings
from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.models.client import Client
from backend.models.invoice import Invoice
from backend.models.reservation import Reservation
from backend.models.room import Room
from backend.models.room_type import RoomType
from backend.models.user import User
from backend.models.hotel_setting import HotelSetting
from backend.schemas.invoice import (
    InvoiceCreate,
    InvoiceResponse,
    InvoiceUpdate,
    InvoiceWithReservationResponse,
    InvoiceStatsResponse,
    SendInvoiceEmailRequest
)

router = APIRouter(prefix="/invoices", tags=["Invoices"])
settings = get_settings()

# Initialize Jinja2 for PDF templates
jinja_env = Environment(loader=FileSystemLoader("backend/templates"))


def get_hotel_settings_dict(db: Session) -> dict:
    """Get hotel settings as a dictionary with fallback values."""
    settings_map = {}
    
    # Get all settings from database
    settings = db.query(HotelSetting).all()
    for setting in settings:
        settings_map[setting.key] = setting.value
    
    # Return settings with fallbacks
    return {
        "hotel_name": settings_map.get("hotel_name", "InnDesk Hôtel"),
        "hotel_address": settings_map.get("hotel_address", "123 Rue de la Paix"),
        "hotel_city": settings_map.get("hotel_city", "Paris"),
        "hotel_zip": settings_map.get("hotel_zip", "75001"),
        "hotel_country": settings_map.get("hotel_country", "France"),
        "hotel_phone": settings_map.get("hotel_phone", "01 23 45 67 89"),
        "hotel_email": settings_map.get("hotel_email", "contact@inndesk-hotel.fr"),
        "hotel_siret": settings_map.get("hotel_siret", "12345678901234"),
        "tva_rate": float(settings_map.get("tva_rate", "10.0"))
    }


@router.get("/stats", response_model=InvoiceStatsResponse)
def get_invoice_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get invoice statistics for dashboard"""
    total_invoices = db.query(Invoice).count()
    
    # Total paid amount (sum of total_ttc for paid invoices)
    paid_invoices = db.query(Invoice).filter(Invoice.payment_status == "paid")
    total_paid_amount = paid_invoices.with_entities(func.sum(Invoice.total_ttc)).scalar() or Decimal("0.00")
    
    # Pending invoices count
    pending_count = db.query(Invoice).filter(Invoice.payment_status == "pending").count()
    
    # Recovery rate (paid invoices / total invoices * 100)
    recovery_rate = (paid_invoices.count() / total_invoices * 100) if total_invoices > 0 else 0.0
    
    return InvoiceStatsResponse(
        total_invoices=total_invoices,
        total_paid_amount=total_paid_amount,
        pending_count=pending_count,
        recovery_rate=recovery_rate
    )


@router.get("/", response_model=list[InvoiceWithReservationResponse])
def get_invoices(
    payment_status: str | None = None,
    search: str | None = None,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all invoices with reservation details"""
    query = (
        db.query(Invoice)
        .join(Reservation)
        .join(Client)
        .join(Room)
        .join(RoomType)
        .options(
            joinedload(Invoice.reservation)
            .joinedload(Reservation.client),
            joinedload(Invoice.reservation)
            .joinedload(Reservation.room)
            .joinedload(Room.room_type)
        )
    )
    
    if payment_status and payment_status.strip():
        query = query.filter(Invoice.payment_status == payment_status)
    
    if search and search.strip():
        search_pattern = f"%{search}%"
        query = query.filter(
            (Client.first_name.ilike(search_pattern)) |
            (Client.last_name.ilike(search_pattern)) |
            (Invoice.id.cast(String).ilike(search_pattern))
        )
    
    invoices = query.order_by(Invoice.created_at.desc()).offset(offset).limit(limit).all()
    
    # Transform to response format with joined data
    response = []
    for invoice in invoices:
        invoice_data = InvoiceWithReservationResponse(
            **invoice.__dict__,
            client_name=f"{invoice.reservation.client.first_name} {invoice.reservation.client.last_name}",
            client_email=invoice.reservation.client.email,
            room_number=invoice.reservation.room.number,
            room_type_name=invoice.reservation.room.room_type.name,
            check_in_date=invoice.reservation.check_in_date,
            check_out_date=invoice.reservation.check_out_date
        )
        response.append(invoice_data)
    
    return response


@router.get("/available-reservations")
def get_available_reservations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get checked_out reservations without invoices for generate modal"""
    # Get reservations that are checked_out and don't have an invoice
    reservations = (
        db.query(Reservation)
        .join(Client)
        .join(Room)
        .join(RoomType)
        .outerjoin(Invoice)
        .filter(
            Reservation.status == "checked_out",
            Invoice.id.is_(None)  # No invoice exists
        )
        .options(
            joinedload(Reservation.client),
            joinedload(Reservation.room).joinedload(Room.room_type)
        )
        .order_by(Reservation.check_out_date.desc())
        .all()
    )
    
    # Transform to simple response format
    result = []
    for reservation in reservations:
        nights = (reservation.check_out_date - reservation.check_in_date).days
        estimated_amount = reservation.room.room_type.price_per_night * nights
        result.append({
            "id": reservation.id,
            "client_name": f"{reservation.client.first_name} {reservation.client.last_name}",
            "room_number": reservation.room.number,
            "room_type": reservation.room.room_type.name,
            "check_in_date": reservation.check_in_date.isoformat(),
            "check_out_date": reservation.check_out_date.isoformat(),
            "nights": nights,
            "estimated_amount": float(estimated_amount)
        })
    
    return result


@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get single invoice by ID"""
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
    """Create invoice from reservation"""
    # Check reservation exists and is checked out
    reservation = (
        db.query(Reservation)
        .options(joinedload(Reservation.room).joinedload(Room.room_type))
        .filter(Reservation.id == invoice_data.reservation_id)
        .first()
    )
    
    if not reservation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Réservation non trouvée"
        )
    
    if reservation.status != "checked_out":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Seules les réservations avec statut 'départ' peuvent être facturées"
        )
    
    # Check if invoice already exists
    existing_invoice = db.query(Invoice).filter(Invoice.reservation_id == reservation.id).first()
    if existing_invoice:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Une facture existe déjà pour cette réservation"
        )
    
    # Calculate invoice amounts
    nights_count = (reservation.check_out_date - reservation.check_in_date).days
    room_rate = reservation.room.room_type.price_per_night
    total_amount_ht = room_rate * nights_count
    
    # Get TVA rate from hotel settings
    hotel_settings = get_hotel_settings_dict(db)
    tva_rate = Decimal(str(hotel_settings["tva_rate"]))
    
    tva_amount = total_amount_ht * tva_rate / 100
    total_ttc = total_amount_ht + tva_amount
    
    # Create invoice
    invoice = Invoice(
        reservation_id=reservation.id,
        nights_count=nights_count,
        room_rate=room_rate,
        total_amount=total_amount_ht,
        tva_rate=tva_rate,
        tva_amount=tva_amount,
        total_ttc=total_ttc,
        payment_status="pending"
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
    """Update invoice payment status and details"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Facture non trouvée"
        )
    
    # Prevent changing from paid back to pending
    if invoice.payment_status == "paid" and invoice_data.payment_status == "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Impossible de repasser une facture payée en attente"
        )
    
    # Update fields
    if invoice_data.payment_status is not None:
        invoice.payment_status = invoice_data.payment_status
        if invoice_data.payment_status == "paid" and not invoice.paid_at:
            invoice.paid_at = datetime.now(timezone.utc)
    
    if invoice_data.payment_method is not None:
        invoice.payment_method = invoice_data.payment_method
    
    if invoice_data.paid_at is not None:
        invoice.paid_at = invoice_data.paid_at
    
    if invoice_data.notes is not None:
        invoice.notes = invoice_data.notes
    
    db.commit()
    db.refresh(invoice)
    
    return invoice


@router.get("/{invoice_id}/pdf")
def get_invoice_pdf(
    invoice_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate and download PDF invoice"""
    # Get invoice with all related data
    invoice = (
        db.query(Invoice)
        .join(Reservation)
        .join(Client)
        .join(Room)
        .join(RoomType)
        .options(
            joinedload(Invoice.reservation).joinedload(Reservation.client),
            joinedload(Invoice.reservation).joinedload(Reservation.room).joinedload(Room.room_type)
        )
        .filter(Invoice.id == invoice_id)
        .first()
    )
    
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Facture non trouvée"
        )
    
    # Get hotel settings from database
    hotel_settings = get_hotel_settings_dict(db)
    
    # Format hotel address for PDF
    hotel_full_address = []
    if hotel_settings["hotel_address"]:
        hotel_full_address.append(hotel_settings["hotel_address"])
    
    city_line = []
    if hotel_settings["hotel_zip"]:
        city_line.append(hotel_settings["hotel_zip"])
    if hotel_settings["hotel_city"]:
        city_line.append(hotel_settings["hotel_city"])
    if hotel_settings["hotel_country"] and hotel_settings["hotel_country"] != "France":
        city_line.append(hotel_settings["hotel_country"])
    if city_line:
        hotel_full_address.append(" ".join(city_line))
    
    # Prepare template data
    template_data = {
        "invoice": invoice,
        "reservation": invoice.reservation,
        "client": invoice.reservation.client,
        "room": invoice.reservation.room,
        "room_type": invoice.reservation.room.room_type,
        "hotel_name": hotel_settings["hotel_name"],
        "hotel_address": "\n".join(hotel_full_address),
        "hotel_siret": hotel_settings["hotel_siret"],
        "hotel_email": hotel_settings["hotel_email"],
        "hotel_phone": hotel_settings["hotel_phone"],
        "issue_date": datetime.now(timezone.utc).strftime("%d/%m/%Y")
    }
    
    # Render HTML template
    template = jinja_env.get_template("invoice.html")
    html_content = template.render(**template_data)
    
    # Generate PDF
    pdf_buffer = io.BytesIO()
    HTML(string=html_content).write_pdf(pdf_buffer)
    pdf_buffer.seek(0)
    
    # Create filename
    client_lastname = invoice.reservation.client.last_name.replace(" ", "_")
    filename = f"facture_{invoice.id}_{client_lastname}.pdf"
    
    return StreamingResponse(
        io.BytesIO(pdf_buffer.read()),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.post("/{invoice_id}/send-email")
def send_invoice_email(
    invoice_id: int,
    email_data: SendInvoiceEmailRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send invoice PDF via email"""
    # Get invoice with all related data
    invoice = (
        db.query(Invoice)
        .join(Reservation)
        .join(Client)
        .join(Room)
        .join(RoomType)
        .options(
            joinedload(Invoice.reservation).joinedload(Reservation.client),
            joinedload(Invoice.reservation).joinedload(Reservation.room).joinedload(Room.room_type)
        )
        .filter(Invoice.id == invoice_id)
        .first()
    )
    
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Facture non trouvée"
        )
    
    try:
        # Check if RESEND_API_KEY is properly configured
        if not settings.RESEND_API_KEY or settings.RESEND_API_KEY == "your_resend_api_key_here":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Resend API key not configured. Add RESEND_API_KEY to your .env file."
            )
        
        # Import resend here to handle missing dependency gracefully
        import resend
        
        resend.api_key = settings.RESEND_API_KEY
        
        # Get hotel settings from database
        hotel_settings = get_hotel_settings_dict(db)
        
        # Format hotel address for PDF
        hotel_full_address = []
        if hotel_settings["hotel_address"]:
            hotel_full_address.append(hotel_settings["hotel_address"])
        
        city_line = []
        if hotel_settings["hotel_zip"]:
            city_line.append(hotel_settings["hotel_zip"])
        if hotel_settings["hotel_city"]:
            city_line.append(hotel_settings["hotel_city"])
        if hotel_settings["hotel_country"] and hotel_settings["hotel_country"] != "France":
            city_line.append(hotel_settings["hotel_country"])
        if city_line:
            hotel_full_address.append(" ".join(city_line))
        
        # Generate PDF in memory
        template_data = {
            "invoice": invoice,
            "reservation": invoice.reservation,
            "client": invoice.reservation.client,
            "room": invoice.reservation.room,
            "room_type": invoice.reservation.room.room_type,
            "hotel_name": hotel_settings["hotel_name"],
            "hotel_address": "\n".join(hotel_full_address),
            "hotel_siret": hotel_settings["hotel_siret"],
            "hotel_email": hotel_settings["hotel_email"],
            "hotel_phone": hotel_settings["hotel_phone"],
            "issue_date": datetime.now(timezone.utc).strftime("%d/%m/%Y")
        }
        
        template = jinja_env.get_template("invoice.html")
        html_content = template.render(**template_data)
        
        pdf_buffer = io.BytesIO()
        HTML(string=html_content).write_pdf(pdf_buffer)
        pdf_buffer.seek(0)
        
        # Create filename
        client_lastname = invoice.reservation.client.last_name.replace(" ", "_")
        filename = f"facture_{invoice.id}_{client_lastname}.pdf"
        
        # Get PDF bytes for attachment
        pdf_bytes = pdf_buffer.read()
        
        # Determine from email - use fallback if not configured
        from_email = settings.RESEND_FROM_EMAIL
        if not from_email or from_email == "factures@hotel-de-la-paix.fr":
            from_email = "onboarding@resend.dev"
        
        # Send email with base64-encoded attachment
        response = resend.Emails.send({
            "from": from_email,
            "to": [email_data.email],
            "subject": f"Votre facture — {hotel_settings['hotel_name']}",
            "html": f"""
            <p>Bonjour {invoice.reservation.client.first_name},</p>
            <p>Veuillez trouver ci-joint votre facture pour votre séjour du {invoice.reservation.check_in_date.strftime('%d/%m/%Y')} au {invoice.reservation.check_out_date.strftime('%d/%m/%Y')}.</p>
            <p>Nous vous remercions de votre confiance.</p>
            <p>Cordialement,<br>{hotel_settings['hotel_name']}</p>
            """,
            "attachments": [
                {
                    "filename": filename,
                    "content": base64.b64encode(pdf_bytes).decode("utf-8")
                }
            ]
        })
        
        return {"message": "Facture envoyée par email avec succès", "email_id": response.get("id")}
        
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Service d'envoi d'email non configuré"
        )
    except HTTPException:
        # Re-raise HTTP exceptions (like 400 for missing API key)
        raise
    except Exception as e:
        # Print full traceback to console for debugging
        print("Error sending invoice email:")
        print(traceback.format_exc())
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'envoi de l'email: {str(e)}"
        )
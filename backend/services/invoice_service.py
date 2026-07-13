import io
import logging
from datetime import datetime, timezone
from urllib.parse import quote

from jinja2 import Environment, FileSystemLoader
from sqlalchemy.orm import Session, joinedload
from weasyprint import HTML

from backend.models.client import Client
from backend.models.invoice import Invoice
from backend.models.reservation import Reservation
from backend.models.room import Room
from backend.models.room_type import RoomType
from backend.models.hotel_setting import HotelSetting

logger = logging.getLogger(__name__)

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


def generate_invoice_pdf(invoice_id: int, db: Session) -> tuple[bytes, str]:
    """
    Génère le PDF d'une facture et retourne les bytes et le nom de fichier.
    Lève une ValueError si la facture n'existe pas.
    Lève une RuntimeError si la génération échoue.
    """
    try:
        # Get invoice with all related data
        invoice = (
            db.query(Invoice)
            .join(Reservation)
            .join(Client)
            .outerjoin(Room, Reservation.room_id == Room.id)
            .outerjoin(RoomType, Room.room_type_id == RoomType.id)
            .options(
                joinedload(Invoice.reservation).joinedload(Reservation.client),
                joinedload(Invoice.reservation).joinedload(Reservation.room).joinedload(Room.room_type)
            )
            .filter(Invoice.id == invoice_id)
            .first()
        )
        
        if not invoice:
            raise ValueError(f"Facture {invoice_id} non trouvée")
        
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
        room = invoice.reservation.room if invoice.reservation else None
        room_type = room.room_type if room else None
        template_data = {
            "invoice": invoice,
            "reservation": invoice.reservation,
            "client": invoice.reservation.client,
            "room": room,
            "room_type": room_type,
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
        pdf_bytes = pdf_buffer.read()
        
        # Create filename
        client_lastname = invoice.reservation.client.last_name.strip()
        safe_lastname = quote(client_lastname, safe='')
        filename = f"facture_{invoice.id}_{safe_lastname}.pdf"
        
        return pdf_bytes, filename
        
    except ValueError:
        # Re-raise validation errors
        raise
    except Exception as e:
        logger.error(f"Error generating PDF for invoice {invoice_id}", exc_info=True)
        raise RuntimeError(f"Erreur lors de la génération du PDF: {str(e)}")
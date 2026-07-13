from datetime import date, timedelta
from decimal import Decimal

from backend.models.client import Client
from backend.models.invoice import Invoice
from backend.models.reservation import Reservation
from backend.models.room import Room
from backend.models.room_type import RoomType
from backend.models.user import User
from backend.services.invoice_service import generate_invoice_pdf


def test_generate_invoice_pdf_with_real_inndesk_template(client, db_session):
    user = User(
        email="pdf-admin@test.com",
        password_hash="not-used-by-this-test",
        full_name="PDF Test Admin",
        role="admin",
        is_active=True,
    )
    guest = Client(
        first_name="Élodie",
        last_name="Martin",
        email="elodie.pdf@test.com",
        phone="+33 1 23 45 67 89",
    )
    room_type = RoomType(
        name="Double supérieure",
        description="Chambre utilisée pour le test PDF",
        price_per_night=Decimal("120.00"),
        max_occupancy=2,
    )
    db_session.add_all([user, guest, room_type])
    db_session.flush()

    room = Room(number="PDF-101", floor=1, room_type_id=room_type.id, status="available")
    db_session.add(room)
    db_session.flush()

    reservation = Reservation(
        client_id=guest.id,
        room_type_id=room_type.id,
        room_id=room.id,
        created_by=user.id,
        check_in_date=date.today(),
        check_out_date=date.today() + timedelta(days=2),
        status="confirmed",
        adults=2,
        children=0,
        total_amount=Decimal("240.00"),
    )
    db_session.add(reservation)
    db_session.flush()

    invoice = Invoice(
        reservation_id=reservation.id,
        nights_count=2,
        room_rate=Decimal("120.00"),
        total_amount=Decimal("240.00"),
        tva_rate=Decimal("10.00"),
        tva_amount=Decimal("24.00"),
        total_ttc=Decimal("264.00"),
        payment_method="TPE",
        payment_status="pending",
    )
    db_session.add(invoice)
    db_session.commit()

    pdf, filename = generate_invoice_pdf(invoice.id, db_session)

    assert isinstance(pdf, bytes)
    assert pdf.startswith(b"%PDF")
    assert len(pdf) > 1_000
    assert filename.startswith(f"facture_{invoice.id}_")
    assert filename.endswith(".pdf")

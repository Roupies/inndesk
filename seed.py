#!/usr/bin/env python3
"""
Seed script for InnDesk PMS
Populates the database with realistic demo data
Run with: python seed.py
"""

from datetime import date, datetime, timezone, timedelta
from decimal import Decimal

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.core.config import settings
from backend.core.security import hash_password
from backend.models.user import User
from backend.models.room_type import RoomType
from backend.models.room import Room
from backend.models.client import Client
from backend.models.reservation import Reservation
from backend.models.invoice import Invoice


def main():
    try:
        # Connect to database
        engine = create_engine(settings.DATABASE_URL)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()

        print("🧹 Clearing existing data...")
        
        # Clear existing data in correct order (respecting foreign key constraints)
        db.query(Invoice).delete()
        db.query(Reservation).delete()
        db.query(Client).delete()
        db.query(Room).delete()
        db.query(RoomType).delete()
        db.query(User).delete()
        db.commit()

        print("👥 Creating users...")
        
        # Create users
        admin_user = User(
            email="admin@inndesk.com",
            password_hash=hash_password("admin123"),
            full_name="Admin User",
            role="admin",
            is_active=True
        )
        receptionist_user = User(
            email="reception@inndesk.com",
            password_hash=hash_password("reception123"),
            full_name="Marie Dupont",
            role="receptionist",
            is_active=True
        )
        
        db.add(admin_user)
        db.add(receptionist_user)
        db.commit()
        db.refresh(admin_user)
        db.refresh(receptionist_user)

        print("🏠 Creating room types...")
        
        # Create room types
        standard_type = RoomType(
            name="Standard",
            description="Chambre standard avec tout le confort nécessaire",
            price_per_night=Decimal("89.00"),
            max_occupancy=2
        )
        deluxe_type = RoomType(
            name="Deluxe",
            description="Chambre deluxe avec vue et équipements premium",
            price_per_night=Decimal("129.00"),
            max_occupancy=2
        )
        suite_type = RoomType(
            name="Suite",
            description="Suite spacieuse avec salon séparé",
            price_per_night=Decimal("199.00"),
            max_occupancy=4
        )
        
        db.add(standard_type)
        db.add(deluxe_type)
        db.add(suite_type)
        db.commit()
        db.refresh(standard_type)
        db.refresh(deluxe_type)
        db.refresh(suite_type)

        print("🚪 Creating rooms...")
        
        # Create rooms
        rooms_data = [
            ("101", 1, standard_type.id, "available"),
            ("102", 1, standard_type.id, "available"),
            ("201", 2, deluxe_type.id, "available"),
            ("202", 2, deluxe_type.id, "maintenance"),
            ("301", 3, suite_type.id, "available"),
            ("302", 3, suite_type.id, "available"),
            ("103", 1, standard_type.id, "available"),
            ("203", 2, deluxe_type.id, "available"),
        ]
        
        for number, floor, room_type_id, status in rooms_data:
            room = Room(
                number=number,
                floor=floor,
                room_type_id=room_type_id,
                status=status
            )
            db.add(room)
        
        db.commit()

        print("👤 Creating clients...")
        
        # Create clients
        clients_data = [
            ("Jean", "Martin", "jean.martin@email.com", "France", "+33612345678"),
            ("Sophie", "Bernard", "sophie.bernard@email.com", "France", "+33698765432"),
            ("James", "Wilson", "james.wilson@email.com", "United Kingdom", "+447911123456"),
            ("Anna", "Müller", "anna.mueller@email.com", "Germany", "+4915212345678"),
        ]
        
        clients = []
        for first_name, last_name, email, nationality, phone in clients_data:
            client = Client(
                first_name=first_name,
                last_name=last_name,
                email=email,
                nationality=nationality,
                phone=phone
            )
            db.add(client)
            clients.append(client)
        
        db.commit()
        for client in clients:
            db.refresh(client)

        # Get rooms for reservations
        room_101 = db.query(Room).filter(Room.number == "101").first()
        room_102 = db.query(Room).filter(Room.number == "102").first()
        room_103 = db.query(Room).filter(Room.number == "103").first()
        room_201 = db.query(Room).filter(Room.number == "201").first()
        room_203 = db.query(Room).filter(Room.number == "203").first()
        room_301 = db.query(Room).filter(Room.number == "301").first()
        room_302 = db.query(Room).filter(Room.number == "302").first()

        print("📅 Creating reservations...")

        today = date.today()

        # (client_idx, room, check_in_offset, check_out_offset, adults, children, room_rate, status)
        reservations_data = [
            # --- checked_out: both dates in the past ---
            (2, room_301, -10, -6, 2, 0, Decimal("199.00"), "checked_out"),   # James Wilson
            (3, room_102, -7,  -4, 1, 0, Decimal("89.00"),  "checked_out"),   # Anna Müller
            (0, room_201, -5,  -2, 2, 0, Decimal("129.00"), "checked_out"),   # Jean Martin (past stay)
            # --- checked_in: check_in today or past, check_out future ---
            (0, room_101, -2,  3,  2, 0, Decimal("89.00"),  "checked_in"),    # Jean Martin (current)
            (1, room_203,  0,  4,  2, 0, Decimal("129.00"), "checked_in"),    # Sophie Bernard (today)
            # --- confirmed: all future ---
            (3, room_102,  5,  8,  1, 0, Decimal("89.00"),  "confirmed"),
            (2, room_301,  6,  10, 2, 0, Decimal("199.00"), "confirmed"),
            (1, room_201,  8,  11, 2, 0, Decimal("129.00"), "confirmed"),
            (0, room_103, 10,  13, 1, 1, Decimal("89.00"),  "confirmed"),
            (3, room_302, 12,  16, 2, 2, Decimal("199.00"), "confirmed"),
            (2, room_102, 15,  18, 1, 0, Decimal("89.00"),  "confirmed"),
            (1, room_203, 17,  21, 2, 0, Decimal("129.00"), "confirmed"),
            (0, room_301, 20,  24, 2, 0, Decimal("199.00"), "confirmed"),
            (3, room_101, 22,  25, 1, 0, Decimal("89.00"),  "confirmed"),
            (2, room_201, 25,  29, 2, 0, Decimal("129.00"), "confirmed"),
        ]

        reservations = []
        for client_idx, room, ci_offset, co_offset, adults, children, room_rate, res_status in reservations_data:
            check_in = today + timedelta(days=ci_offset)
            check_out = today + timedelta(days=co_offset)
            nights = (check_out - check_in).days
            total_ht = (room_rate * nights / Decimal("1.1")).quantize(Decimal("0.01"))
            reservation = Reservation(
                client_id=clients[client_idx].id,
                room_id=room.id,
                room_type_id=room.room_type_id,
                created_by=receptionist_user.id,
                check_in_date=check_in,
                check_out_date=check_out,
                adults=adults,
                children=children,
                total_amount=total_ht,
                status=res_status
            )
            db.add(reservation)
            reservations.append(reservation)

        db.commit()
        for reservation in reservations:
            db.refresh(reservation)

        print("🧾 Creating invoices...")

        for reservation in reservations:
            room = db.query(Room).filter(Room.id == reservation.room_id).first()
            room_type = db.query(RoomType).filter(RoomType.id == room.room_type_id).first()
            nights = (reservation.check_out_date - reservation.check_in_date).days
            room_rate = room_type.price_per_night
            total_ttc = (room_rate * nights).quantize(Decimal("0.01"))
            total_ht = (total_ttc / Decimal("1.1")).quantize(Decimal("0.01"))
            tva_amount = (total_ttc - total_ht).quantize(Decimal("0.01"))

            is_paid = reservation.status == "checked_out"
            invoice = Invoice(
                reservation_id=reservation.id,
                nights_count=nights,
                room_rate=room_rate,
                total_amount=total_ht,
                tva_rate=Decimal("10.0"),
                tva_amount=tva_amount,
                total_ttc=total_ttc,
                payment_method="TPE",
                payment_status="paid" if is_paid else "pending",
                paid_at=datetime.now(timezone.utc) if is_paid else None
            )
            db.add(invoice)

        db.commit()

        # Update room statuses based on active reservations
        for reservation in reservations:
            room = db.query(Room).filter(Room.id == reservation.room_id).first()
            if reservation.status == "checked_in":
                room.status = "occupied"
            elif reservation.status == "checked_out" and room.status == "available":
                room.status = "dirty"

        db.commit()

        print("✅ Seeding complete.")
        
    except Exception as e:
        print(f"❌ Error during seeding: {e}")
        if 'db' in locals():
            db.rollback()
        raise
    finally:
        if 'db' in locals():
            db.close()


if __name__ == "__main__":
    main()
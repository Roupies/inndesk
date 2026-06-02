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
                phone=phone,
                gdpr_consent=True,
                gdpr_consent_at=datetime.now(timezone.utc)
            )
            db.add(client)
            clients.append(client)
        
        db.commit()
        for client in clients:
            db.refresh(client)

        # Get rooms for reservations
        room_101 = db.query(Room).filter(Room.number == "101").first()
        room_102 = db.query(Room).filter(Room.number == "102").first()
        room_201 = db.query(Room).filter(Room.number == "201").first()
        room_301 = db.query(Room).filter(Room.number == "301").first()

        print("📅 Creating reservations...")
        
        # Create reservations
        today = date.today()
        reservations_data = [
            # Jean Martin, room 101, today-2 → today+1, 2 adults, total: 267.00, status: checked_in
            (clients[0].id, room_101.id, today - timedelta(days=2), today + timedelta(days=1), 2, 0, Decimal("267.00"), "checked_in"),
            # Sophie Bernard, room 201, today+3 → today+5, 2 adults, total: 258.00, status: confirmed
            (clients[1].id, room_201.id, today + timedelta(days=3), today + timedelta(days=5), 2, 0, Decimal("258.00"), "confirmed"),
            # James Wilson, room 301, today-5 → today-2, 2 adults, total: 597.00, status: checked_out
            (clients[2].id, room_301.id, today - timedelta(days=5), today - timedelta(days=2), 2, 0, Decimal("597.00"), "checked_out"),
            # Anna Müller, room 102, today+1 → today+3, 1 adult, total: 178.00, status: confirmed
            (clients[3].id, room_102.id, today + timedelta(days=1), today + timedelta(days=3), 1, 0, Decimal("178.00"), "confirmed"),
        ]
        
        reservations = []
        for client_id, room_id, check_in, check_out, adults, children, total, status in reservations_data:
            room = db.query(Room).filter(Room.id == room_id).first()
            reservation = Reservation(
                client_id=client_id,
                room_id=room_id,
                room_type_id=room.room_type_id,
                created_by=receptionist_user.id,
                check_in_date=check_in,
                check_out_date=check_out,
                adults=adults,
                children=children,
                total_amount=total,
                status=status
            )
            db.add(reservation)
            reservations.append(reservation)
        
        db.commit()
        for reservation in reservations:
            db.refresh(reservation)

        print("🧾 Creating invoices...")
        
        # Create invoices
        # James Wilson reservation → amount: 597.00, payment_method: card, status: paid, paid_at: now
        james_reservation = next(r for r in reservations if r.client_id == clients[2].id)
        james_invoice = Invoice(
            reservation_id=james_reservation.id,
            nights_count=3,
            room_rate=Decimal("199.00"),
            total_amount=Decimal("597.00"),
            payment_method="card",
            payment_status="paid",
            paid_at=datetime.now(timezone.utc)
        )
        
        # Jean Martin reservation → amount: 267.00, payment_method: cash, status: pending
        jean_reservation = next(r for r in reservations if r.client_id == clients[0].id)
        jean_invoice = Invoice(
            reservation_id=jean_reservation.id,
            nights_count=3,
            room_rate=Decimal("89.00"),
            total_amount=Decimal("267.00"),
            payment_method="cash",
            payment_status="pending"
        )
        
        db.add(james_invoice)
        db.add(jean_invoice)
        db.commit()

        # Update room statuses based on reservations
        # Jean Martin is checked_in → room 101 should be occupied
        room_101.status = "occupied"
        
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
from sqlalchemy import CheckConstraint, Column, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from backend.core.database import Base


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    reservation_id = Column(Integer, ForeignKey("reservations.id"), unique=True, nullable=False)
    nights_count = Column(Integer, nullable=False)
    room_rate = Column(Numeric(10, 2), nullable=False)
    total_amount = Column(Numeric(10, 2), nullable=False)  # HT amount
    tva_rate = Column(Numeric(5, 2), nullable=False, default=10.0)  # TVA percentage (10%)
    tva_amount = Column(Numeric(10, 2), nullable=False)  # TVA amount in euros
    total_ttc = Column(Numeric(10, 2), nullable=False)  # Total TTC (with TVA)
    payment_method = Column(String(50), default="TPE")
    payment_status = Column(String(20), nullable=False, default="pending")
    paid_at = Column(DateTime(timezone=True))
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    reservation = relationship("Reservation", lazy="select")

    __table_args__ = (
        CheckConstraint("nights_count > 0", name="check_nights_positive"),
        CheckConstraint(
            "payment_status IN ('pending', 'paid')",
            name="check_payment_status"
        ),
        CheckConstraint(
            "payment_method IN ('TPE','espèces','visa','mastercard','amex','chèques vacances','virement')"
            " OR payment_method IS NULL",
            name="check_payment_method"
        ),
    )

    def __repr__(self):
        return f"<Invoice(id={self.id}, reservation_id={self.reservation_id})>"
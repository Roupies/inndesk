from sqlalchemy import CheckConstraint, Column, Date, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from backend.core.database import Base


class Reservation(Base):
    __tablename__ = "reservations"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    room_type_id = Column(Integer, ForeignKey("room_types.id"), nullable=False)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    check_in_date = Column(Date, nullable=False)
    check_out_date = Column(Date, nullable=False)
    status = Column(String(20), nullable=False, default="confirmed")
    adults = Column(Integer, nullable=False, default=1)
    children = Column(Integer, nullable=False, default=0)
    notes = Column(Text)
    total_amount = Column(Numeric(10, 2))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    client = relationship("Client", lazy="select")
    room_type = relationship("RoomType", lazy="select")
    room = relationship("Room", lazy="select")
    created_by_user = relationship("User", lazy="select")

    __table_args__ = (
        CheckConstraint(
            "status IN ('confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show')",
            name="check_status"
        ),
        CheckConstraint("adults > 0", name="check_adults_positive"),
        CheckConstraint("children >= 0", name="check_children_not_negative"),
        CheckConstraint("check_out_date > check_in_date", name="chk_dates"),
    )

    def __repr__(self):
        return f"<Reservation(id={self.id}, client_id={self.client_id})>"
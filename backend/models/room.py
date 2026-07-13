from sqlalchemy import CheckConstraint, Column, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from backend.core.database import Base


class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    number = Column(String(10), unique=True, nullable=False, index=True)
    floor = Column(Integer, nullable=False)
    room_type_id = Column(Integer, ForeignKey("room_types.id"), nullable=False)
    status = Column(String(20), nullable=False, default="available")
    notes = Column(Text)

    room_type = relationship("RoomType", lazy="select")

    __table_args__ = (
        CheckConstraint(
            "status IN ('available', 'occupied', 'dirty', 'cleaning', 'maintenance')",
            name="check_status"
        ),
    )

    def __repr__(self):
        return f"<Room(id={self.id}, number='{self.number}')>"
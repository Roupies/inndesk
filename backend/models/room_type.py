from sqlalchemy import CheckConstraint, Column, Integer, Numeric, String, Text

from backend.core.database import Base


class RoomType(Base):
    __tablename__ = "room_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    price_per_night = Column(Numeric(10, 2), nullable=False)
    max_occupancy = Column(Integer, nullable=False)

    __table_args__ = (
        CheckConstraint("price_per_night > 0", name="check_price_positive"),
        CheckConstraint("max_occupancy > 0", name="check_max_occupancy_positive"),
    )

    def __repr__(self):
        return f"<RoomType(id={self.id}, name='{self.name}')>"
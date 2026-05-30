from sqlalchemy import Boolean, Column, DateTime, Integer, String, CheckConstraint
from sqlalchemy.sql import func

from backend.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint("role IN ('admin', 'receptionist')", name="check_role"),
    )

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}')>"
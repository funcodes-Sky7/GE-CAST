from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.session import Base

class Fleet(Base):
    __tablename__ = "fleets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True) # e.g. "Chandigarh Transport", "Delhi Transport"
    organization = Column(String(150), nullable=True)                  # e.g. "Chandigarh City Corp", "DTC"
    device_type = Column(String(50), default="BUS", nullable=False)    # Default device type: "BUS", "TRAIN", etc.
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship to devices
    devices = relationship("Device", back_populates="fleet", cascade="all, delete-orphan")

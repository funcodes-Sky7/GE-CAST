from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from datetime import datetime
from app.db.session import Base

class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    owner_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    media_url = Column(String(500), nullable=True)
    # Comma-separated zone IDs e.g. "1,3,5"
    zone_ids = Column(Text, nullable=True)
    # Comma-separated device types e.g. "BUS,BILLBOARD,METRO,STATION,KIOSK"
    device_types = Column(String(255), nullable=True)
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    # Priority (1-10, higher receives more rotation slots)
    priority = Column(Integer, default=5, nullable=False)
    # status: "draft" | "active" | "scheduled" | "completed" | "paused"
    status = Column(String(50), nullable=False, default="draft")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

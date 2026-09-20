from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.session import Base

class Schedule(Base):
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    
    # Target zone (optional - if targeting all devices in this zone)
    zone_id = Column(Integer, ForeignKey("zones.id", ondelete="CASCADE"), nullable=True)
    zone = relationship("Zone", foreign_keys=[zone_id])
    
    # Target device (optional - if targeting a specific device)
    device_id = Column(Integer, ForeignKey("devices.id", ondelete="CASCADE"), nullable=True)
    device = relationship("Device", foreign_keys=[device_id])
    
    # Content to display during scheduled window
    content_id = Column(Integer, ForeignKey("contents.id", ondelete="CASCADE"), nullable=False)
    content = relationship("Content", foreign_keys=[content_id])
    
    # Time window (e.g. 2026-09-20 09:00:00 to 2026-09-20 18:00:00)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    
    # Priority (higher takes precedence when multiple schedules match)
    priority = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from datetime import datetime
from app.db.session import Base

class Log(Base):
    __tablename__ = "logs"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(100), nullable=True, index=True)  # Device string identifier (e.g. DEV001)
    event_type = Column(String(100), nullable=False, index=True) 
    # Event types:
    # "DEVICE_CHECKIN", "ZONE_TRANSITION", "CONTENT_TRANSITION",
    # "DEVICE_ONLINE", "DEVICE_OFFLINE", "ADMIN_UPDATE"
    
    details_json = Column(Text, nullable=True)  # JSON-encoded payload details or context
    message = Column(String(500), nullable=True) # Human readable summary
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

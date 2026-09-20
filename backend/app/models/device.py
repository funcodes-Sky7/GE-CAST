from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.session import Base
from app.models.fleet import Fleet
from app.models.zone import Zone

class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(100), unique=True, index=True, nullable=False)  # e.g. "BUS-001", "DEV001"
    name = Column(String(255), nullable=False)
    token = Column(String(255), unique=True, index=True, nullable=False)      # Device API authentication token
    
    # Device Categorization & Fleet
    device_type = Column(String(50), default="BUS", index=True, nullable=False) # BUS, TRAIN, STATION, DIGITAL_SIGNAGE, KIOSK, LED_SCREEN
    fleet_id = Column(Integer, ForeignKey("fleets.id", ondelete="SET NULL"), nullable=True, index=True)
    fleet = relationship("Fleet", back_populates="devices")
    
    # Location & Zone
    current_lat = Column(Float, nullable=True)
    current_lon = Column(Float, nullable=True)
    location_name = Column(String(255), nullable=True)                         # Human-readable location, e.g. "Delhi - Connaught Place"
    current_zone_id = Column(Integer, ForeignKey("zones.id", ondelete="SET NULL"), nullable=True)
    current_zone = relationship("Zone", foreign_keys=[current_zone_id])
    
    # Content Overrides & Defaults
    override_content_id = Column(Integer, ForeignKey("contents.id", ondelete="SET NULL"), nullable=True)
    override_content = relationship("Content", foreign_keys=[override_content_id])
    
    default_content_id = Column(Integer, ForeignKey("contents.id", ondelete="SET NULL"), nullable=True)
    default_content = relationship("Content", foreign_keys=[default_content_id])
    
    # Active content currently showing on screen
    active_content_id = Column(Integer, ForeignKey("contents.id", ondelete="SET NULL"), nullable=True)
    active_content = relationship("Content", foreign_keys=[active_content_id])
    
    # Status & Telemetry
    status = Column(String(50), default="OFFLINE", index=True)  # "ONLINE", "OFFLINE", "WARNING"
    last_seen = Column(DateTime, nullable=True)
    refresh_interval = Column(Integer, default=10)             # Polling/heartbeat interval in seconds
    created_at = Column(DateTime, default=datetime.utcnow)

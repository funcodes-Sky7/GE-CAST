from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.session import Base
from app.core.config import settings
from app.models.content import Content

# PostGIS Geometry on PostgreSQL, Text column on SQLite fallback
if settings.DATABASE_URL.startswith("postgresql"):
    from geoalchemy2 import Geometry
    geom_col = Column(Geometry(geometry_type='GEOMETRY', srid=4326), nullable=True)
else:
    geom_col = Column(Text, nullable=True)

class Zone(Base):
    __tablename__ = "zones"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    zone_type = Column(String(50), default="circle", nullable=False)  # "circle" | "polygon"
    
    # Circle properties
    center_lat = Column(Float, nullable=True)
    center_lon = Column(Float, nullable=True)
    radius_meters = Column(Float, nullable=True)
    
    # Polygon GeoJSON string representation
    coordinates_json = Column(Text, nullable=True)
    
    # PostGIS spatial geometry (SRID 4326 - WGS 84 GPS coordinates)
    # Stored as Geometry in PostgreSQL + PostGIS, or WKT string in SQLite
    geom = geom_col

    # Assigned content for this zone
    assigned_content_id = Column(Integer, ForeignKey("contents.id", ondelete="SET NULL"), nullable=True)
    assigned_content = relationship("Content", foreign_keys=[assigned_content_id])

    color = Column(String(50), default="#3b82f6")  # UI map color code
    created_at = Column(DateTime, default=datetime.utcnow)

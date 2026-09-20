from sqlalchemy import Column, Integer, String, Text, DateTime, Float
from datetime import datetime
from app.db.session import Base

class Content(Base):
    __tablename__ = "contents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    file_url = Column(String(1024), nullable=False)     # Direct access URL for devices/dashboards
    storage_key = Column(String(512), nullable=True)    # Path on disk or S3/Supabase key
    media_type = Column(String(50), nullable=False)     # "image" or "video"
    file_size = Column(Integer, nullable=True)          # Bytes
    duration = Column(Float, default=10.0)              # Display duration in seconds
    tags = Column(String(255), nullable=True)           # Comma separated
    created_at = Column(DateTime, default=datetime.utcnow)

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.schemas.content import ContentResponse

class ZoneBase(BaseModel):
    name: str
    description: Optional[str] = None
    zone_type: str = "circle" # "circle" | "polygon"
    center_lat: Optional[float] = None
    center_lon: Optional[float] = None
    radius_meters: Optional[float] = None
    coordinates_json: Optional[str] = None # JSON string: [[lat, lon], ...]
    color: Optional[str] = "#3b82f6"
    assigned_content_id: Optional[int] = None

class ZoneCreate(ZoneBase):
    pass

class ZoneUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    zone_type: Optional[str] = None
    center_lat: Optional[float] = None
    center_lon: Optional[float] = None
    radius_meters: Optional[float] = None
    coordinates_json: Optional[str] = None
    color: Optional[str] = None
    assigned_content_id: Optional[int] = None

class ZoneResponse(ZoneBase):
    id: int
    created_at: datetime
    assigned_content: Optional[ContentResponse] = None

    class Config:
        from_attributes = True

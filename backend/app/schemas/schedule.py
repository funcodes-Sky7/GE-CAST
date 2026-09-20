from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.schemas.content import ContentResponse
from app.schemas.zone import ZoneResponse

class ScheduleBase(BaseModel):
    name: str
    zone_id: Optional[int] = None
    device_id: Optional[int] = None
    content_id: int
    start_time: datetime
    end_time: datetime
    priority: Optional[int] = 1
    is_active: Optional[bool] = True

class ScheduleCreate(ScheduleBase):
    pass

class ScheduleUpdate(BaseModel):
    name: Optional[str] = None
    zone_id: Optional[int] = None
    device_id: Optional[int] = None
    content_id: Optional[int] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None

class ScheduleResponse(ScheduleBase):
    id: int
    created_at: datetime
    content: Optional[ContentResponse] = None
    zone: Optional[ZoneResponse] = None

    class Config:
        from_attributes = True

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class DashboardOverview(BaseModel):
    total_devices: int
    online_devices: int
    offline_devices: int
    total_zones: int
    total_contents: int
    active_schedules: int

class AuditLogResponse(BaseModel):
    id: int
    device_id: Optional[str] = None
    event_type: str
    details_json: Optional[str] = None
    message: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True

class ZoneStatResponse(BaseModel):
    zone_id: int
    name: str
    color: str
    device_count: int
    online_count: Optional[int] = 0


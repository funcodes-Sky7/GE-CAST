from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime
from app.schemas.content import ContentResponse
from app.schemas.zone import ZoneResponse
from app.schemas.fleet import FleetResponse

class DeviceBase(BaseModel):
    device_id: str
    name: str
    device_type: Optional[str] = "BUS"  # BUS, TRAIN, STATION, DIGITAL_SIGNAGE, KIOSK, LED_SCREEN
    fleet_id: Optional[int] = None
    location_name: Optional[str] = None
    refresh_interval: Optional[int] = 10
    default_content_id: Optional[int] = None
    override_content_id: Optional[int] = None

class DeviceCreate(DeviceBase):
    token: Optional[str] = None

class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    device_type: Optional[str] = None
    fleet_id: Optional[int] = None
    location_name: Optional[str] = None
    refresh_interval: Optional[int] = None
    default_content_id: Optional[int] = None
    override_content_id: Optional[int] = None

class DeviceLocationUpdate(BaseModel):
    latitude: float
    longitude: float

class DeviceHeartbeat(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    timestamp: Optional[datetime] = None

class DeviceResponse(DeviceBase):
    id: int
    token: str
    current_lat: Optional[float] = None
    current_lon: Optional[float] = None
    location_name: Optional[str] = None
    current_zone_id: Optional[int] = None
    status: str  # "ONLINE", "OFFLINE", "WARNING"
    last_seen: Optional[datetime] = None
    created_at: datetime
    active_content: Optional[ContentResponse] = None
    current_zone: Optional[ZoneResponse] = None
    fleet: Optional[FleetResponse] = None
    content_reason: Optional[str] = None

    class Config:
        from_attributes = True

class DeviceStats(BaseModel):
    total_devices: int
    online_devices: int
    offline_devices: int
    warning_devices: int
    active_zones: int

class DevicePaginatedResponse(BaseModel):
    items: List[DeviceResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
    stats: DeviceStats

class DeviceLogItem(BaseModel):
    id: int
    timestamp: datetime
    event_type: str
    message: Optional[str] = None
    details_json: Optional[str] = None

    class Config:
        from_attributes = True

class DeviceDetailResponse(DeviceResponse):
    assignment_reason: Optional[str] = None
    assigned_by: Optional[str] = None
    recent_logs: List[DeviceLogItem] = []

class ContentPayload(BaseModel):
    id: int
    title: str
    file_url: str
    media_type: str = "image"
    duration: Optional[float] = 10.0
    tags: Optional[str] = None

class DeviceCurrentContentResponse(BaseModel):
    device_id: str
    content_id: Optional[int] = None
    content: Optional[ContentPayload] = None
    reason: str  # e.g., "ZONE_SCHEDULE", "ZONE_ASSIGNMENT", "DEVICE_OVERRIDE", "DEFAULT_FALLBACK", "NONE"
    zone_id: Optional[int] = None
    zone_name: Optional[str] = None
    timestamp: datetime = datetime.utcnow()

class DeviceLocationMarker(BaseModel):
    device_id: str
    name: str
    device_type: Optional[str] = "BUS"
    fleet_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_name: Optional[str] = None
    status: str
    current_zone: Optional[str] = None
    current_content_title: Optional[str] = None
    current_content_url: Optional[str] = None
    last_seen: Optional[datetime] = None

class DeviceActionRequest(BaseModel):
    action: str  # "restart_player", "sync_device", "remote_config"
    params: Optional[dict] = None

from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class FleetBase(BaseModel):
    name: str
    organization: Optional[str] = None
    device_type: str = "BUS"

class FleetCreate(FleetBase):
    pass

class FleetResponse(FleetBase):
    id: int
    created_at: datetime
    device_count: Optional[int] = 0

    class Config:
        from_attributes = True

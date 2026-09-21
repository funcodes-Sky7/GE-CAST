from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ContentBase(BaseModel):
    title: str
    description: Optional[str] = None
    media_type: str = "image" # "image" | "video"
    duration: Optional[float] = 10.0
    tags: Optional[str] = None
    zone_ids: Optional[str] = None
    priority: Optional[int] = 5
    is_active: Optional[bool] = True
    is_default: Optional[bool] = False
    campaign_id: Optional[int] = None

class ContentCreate(ContentBase):
    file_url: str
    storage_key: Optional[str] = None
    file_size: Optional[int] = None

class ContentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    duration: Optional[float] = None
    tags: Optional[str] = None
    file_url: Optional[str] = None
    zone_ids: Optional[str] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None

class ContentResponse(ContentBase):
    id: int
    file_url: str
    storage_key: Optional[str] = None
    file_size: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


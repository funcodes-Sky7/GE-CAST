from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ContentBase(BaseModel):
    title: str
    description: Optional[str] = None
    media_type: str = "image" # "image" | "video"
    duration: Optional[float] = 10.0
    tags: Optional[str] = None

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

class ContentResponse(ContentBase):
    id: int
    file_url: str
    storage_key: Optional[str] = None
    file_size: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

from pydantic import BaseModel, field_validator, model_validator
from typing import Optional
from datetime import datetime, timedelta


class CampaignCreate(BaseModel):
    name: str
    description: Optional[str] = None
    media_url: Optional[str] = None
    zone_ids: Optional[str] = None       # comma-separated zone IDs
    device_types: Optional[str] = None   # comma-separated device types e.g. "BUS,BILLBOARD,METRO"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    priority: Optional[int] = 5          # 1 to 10 priority weighting
    status: Optional[str] = "draft"

    @field_validator("start_date")
    @classmethod
    def validate_start_date(cls, v: Optional[datetime]) -> Optional[datetime]:
        if v is not None:
            now_minus_grace = datetime.utcnow() - timedelta(minutes=30)
            compare_dt = v.replace(tzinfo=None) if v.tzinfo else v
            if compare_dt < now_minus_grace:
                raise ValueError("Campaign start date cannot be in the past. Please select the current date and time or a future date.")
        return v

    @model_validator(mode="after")
    def validate_date_range(self) -> "CampaignCreate":
        if self.start_date and self.end_date:
            sd = self.start_date.replace(tzinfo=None) if self.start_date.tzinfo else self.start_date
            ed = self.end_date.replace(tzinfo=None) if self.end_date.tzinfo else self.end_date
            if ed < sd:
                raise ValueError("Campaign end date must be after start date.")
        return self


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    media_url: Optional[str] = None
    zone_ids: Optional[str] = None
    device_types: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    priority: Optional[int] = None
    status: Optional[str] = None

    @model_validator(mode="after")
    def validate_date_range(self) -> "CampaignUpdate":
        if self.start_date and self.end_date:
            sd = self.start_date.replace(tzinfo=None) if self.start_date.tzinfo else self.start_date
            ed = self.end_date.replace(tzinfo=None) if self.end_date.tzinfo else self.end_date
            if ed < sd:
                raise ValueError("Campaign end date must be after start date.")
        return self


class CampaignResponse(BaseModel):
    id: int
    owner_user_id: int
    name: str
    description: Optional[str] = None
    media_url: Optional[str] = None
    zone_ids: Optional[str] = None
    device_types: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    priority: int = 5
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

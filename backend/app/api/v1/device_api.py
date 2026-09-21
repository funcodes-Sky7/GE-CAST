from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.device import Device
from app.schemas.device import (
    DeviceHeartbeat,
    DeviceLocationUpdate,
    DeviceCurrentContentResponse,
    DeviceResponse
)
from app.services.device_service import get_device_by_token, get_device_by_id_str, process_device_telemetry
from app.services.assignment_engine import get_current_content

router = APIRouter(prefix="/device", tags=["Device Edge API (Device Auth)"])

def authenticate_device(
    x_device_token: Optional[str] = Header(None, alias="X-Device-Token"),
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db)
) -> Device:
    """Authenticate physical/simulated device via device-specific token/API key"""
    device_token = x_device_token or token
    if not device_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Device authentication token missing (pass via X-Device-Token header or ?token= param)"
        )
    device = get_device_by_token(db, device_token)
    if not device:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid device authentication token"
        )
    return device

# Heartbeat endpoints
@router.post("/heartbeat", response_model=DeviceCurrentContentResponse)
async def device_heartbeat(
    payload: DeviceHeartbeat,
    device: Device = Depends(authenticate_device),
    db: Session = Depends(get_db)
):
    """
    Heartbeat and telemetry ping from authenticated device.
    Updates last_seen, computes PostGIS zone, evaluates content, and returns current active media.
    """
    decision = await process_device_telemetry(
        db=db,
        device=device,
        latitude=payload.latitude,
        longitude=payload.longitude
    )
    return DeviceCurrentContentResponse(**decision)

@router.post("/{device_id}/heartbeat", response_model=DeviceCurrentContentResponse)
async def device_heartbeat_by_id(
    device_id: str,
    payload: DeviceHeartbeat,
    x_device_token: Optional[str] = Header(None, alias="X-Device-Token"),
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Explicit REST heartbeat endpoint: POST /api/device/{device_id}/heartbeat"""
    device = get_device_by_id_str(db, device_id)
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
    
    # Check token if supplied
    req_token = x_device_token or token
    if req_token and device.token != req_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token for this device")

    decision = await process_device_telemetry(
        db=db,
        device=device,
        latitude=payload.latitude,
        longitude=payload.longitude
    )
    return DeviceCurrentContentResponse(**decision)

# Location endpoints
@router.post("/location", response_model=DeviceCurrentContentResponse)
async def update_location(
    location: DeviceLocationUpdate,
    device: Device = Depends(authenticate_device),
    db: Session = Depends(get_db)
):
    """Update device GPS coordinates and instantly trigger zone evaluation"""
    decision = await process_device_telemetry(
        db=db,
        device=device,
        latitude=location.latitude,
        longitude=location.longitude
    )
    return DeviceCurrentContentResponse(**decision)

@router.post("/{device_id}/location", response_model=DeviceCurrentContentResponse)
async def update_location_by_id(
    device_id: str,
    location: DeviceLocationUpdate,
    x_device_token: Optional[str] = Header(None, alias="X-Device-Token"),
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Explicit REST location update: POST /api/device/{device_id}/location"""
    device = get_device_by_id_str(db, device_id)
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
    
    req_token = x_device_token or token
    if req_token and device.token != req_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token for this device")

    decision = await process_device_telemetry(
        db=db,
        device=device,
        latitude=location.latitude,
        longitude=location.longitude
    )
    return DeviceCurrentContentResponse(**decision)

# Content resolution endpoints
@router.get("/content", response_model=DeviceCurrentContentResponse)
def get_device_content(
    device: Device = Depends(authenticate_device),
    db: Session = Depends(get_db)
):
    """Query currently resolved content based on location, zone, and schedule"""
    assignment = get_current_content(db, device)
    selected_content = assignment["content"]
    content_payload = None
    if selected_content:
        content_payload = {
            "id": selected_content.id,
            "title": selected_content.title,
            "file_url": selected_content.file_url,
            "media_type": selected_content.media_type,
            "duration": selected_content.duration
        }
    return DeviceCurrentContentResponse(
        device_id=device.device_id,
        content_id=assignment["content_id"],
        content=content_payload,
        reason=assignment["reason"],
        zone_id=assignment.get("zone_id"),
        zone_name=assignment.get("zone_name")
    )

@router.get("/{device_id}/content", response_model=DeviceCurrentContentResponse)
def get_device_content_by_id(
    device_id: str,
    x_device_token: Optional[str] = Header(None, alias="X-Device-Token"),
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    device = get_device_by_id_str(db, device_id)
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
    
    req_token = x_device_token or token
    if req_token and device.token != req_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    assignment = get_current_content(db, device)
    selected_content = assignment["content"]
    content_payload = None
    if selected_content:
        content_payload = {
            "id": selected_content.id,
            "title": selected_content.title,
            "file_url": selected_content.file_url,
            "media_type": selected_content.media_type,
            "duration": selected_content.duration
        }
    return DeviceCurrentContentResponse(
        device_id=device.device_id,
        content_id=assignment["content_id"],
        content=content_payload,
        reason=assignment["reason"],
        zone_id=assignment.get("zone_id"),
        zone_name=assignment.get("zone_name")
    )

# Configuration endpoints
@router.get("/config")
@router.get("/{device_id}/configuration")
def get_device_config(
    device_id: Optional[str] = None,
    x_device_token: Optional[str] = Header(None, alias="X-Device-Token"),
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Fetch remote device configuration (polling interval, identifiers)"""
    if device_id:
        device = get_device_by_id_str(db, device_id)
        if not device:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
        req_token = x_device_token or token
        if req_token and device.token != req_token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    else:
        device = authenticate_device(x_device_token, token, db)

    return {
        "device_id": device.device_id,
        "name": device.name,
        "device_type": device.device_type,
        "refresh_interval": device.refresh_interval,
        "status": device.status
    }

class DeviceImpressionRequest(BaseModel):
    campaign_id: Optional[int] = None
    title: Optional[str] = None
    zone_id: Optional[int] = None
    zone_name: Optional[str] = None
    duration_played: float = 3.0

@router.post("/impression")
@router.post("/{device_id}/impression")
def record_ad_impression(
    payload: DeviceImpressionRequest,
    device_id: Optional[str] = None,
    x_device_token: Optional[str] = Header(None, alias="X-Device-Token"),
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Record verified playback impression for an advertisement slot (3s)"""
    if device_id:
        device = get_device_by_id_str(db, device_id)
        if not device:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
    else:
        device = authenticate_device(x_device_token, token, db)

    now = datetime.utcnow()
    ad_title = payload.title or (f"Campaign #{payload.campaign_id}" if payload.campaign_id else "Ad Slot")
    zone_label = payload.zone_name or (device.current_zone.name if device.current_zone else "Transit")
    
    log_entry = Log(
        device_id=device.device_id,
        event_type="AD_IMPRESSION",
        message=f"Ad Impression: '{ad_title}' played for {payload.duration_played:.0f}s in {zone_label}",
        details_json=json.dumps({
            "campaign_id": payload.campaign_id,
            "title": ad_title,
            "zone_id": payload.zone_id or device.current_zone_id,
            "zone_name": zone_label,
            "duration": payload.duration_played,
            "device_id": device.device_id,
            "device_type": device.device_type
        }),
        timestamp=now
    )
    db.add(log_entry)
    db.commit()
    return {"status": "ok", "message": "Impression recorded", "timestamp": now.isoformat()}

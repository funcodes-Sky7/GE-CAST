import math
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc
from app.db.session import get_db
from app.models.device import Device
from app.models.fleet import Fleet
from app.models.zone import Zone
from app.models.log import Log
from app.models.content import Content
from app.schemas.device import (
    DeviceCreate,
    DeviceUpdate,
    DeviceResponse,
    DevicePaginatedResponse,
    DeviceStats,
    DeviceDetailResponse,
    DeviceLocationMarker,
    DeviceActionRequest,
    DeviceLogItem
)
from app.services.device_service import create_device, get_device_by_id_str
from app.services.assignment_engine import get_current_content
from app.services.websocket_manager import ws_manager

router = APIRouter(prefix="/devices", tags=["Devices (Admin)"])

@router.get("/locations", response_model=List[DeviceLocationMarker])
def get_device_locations(db: Session = Depends(get_db)):
    """Live device location markers for the React dashboard & fleet map"""
    devices = db.query(Device).all()
    results = []
    for d in devices:
        assignment = get_current_content(db, d)
        pl = assignment.get("playlist") or []
        dur = assignment.get("slot_duration") or 3
        active_title = d.active_content.title if d.active_content else (pl[0]["title"] if pl else None)
        active_url = d.active_content.file_url if d.active_content else (pl[0]["file_url"] if pl else None)

        results.append(DeviceLocationMarker(
            device_id=d.device_id,
            name=d.name,
            device_type=d.device_type,
            fleet_name=d.fleet.name if d.fleet else None,
            latitude=d.current_lat,
            longitude=d.current_lon,
            location_name=d.location_name,
            status=d.status,
            current_zone=d.current_zone.name if d.current_zone else assignment.get("zone_name"),
            current_content_title=active_title,
            current_content_url=active_url,
            playlist=pl,
            slot_duration=dur,
            last_seen=d.last_seen
        ))
    return results

@router.get("", response_model=DevicePaginatedResponse)
def list_devices(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    search: Optional[str] = Query(None),
    device_type: Optional[str] = Query(None),
    fleet_id: Optional[int] = Query(None),
    zone_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("last_seen"),
    sort_order: Optional[str] = Query("desc"),
    db: Session = Depends(get_db)
):
    """
    Fleet-Management Server-Side Paginated Device Search & Filtering
    Supports:
    - Search by Device ID, Name, Location, Fleet
    - Filter by Device Type (BUS, TRAIN, STATION, DIGITAL_SIGNAGE, KIOSK, LED_SCREEN)
    - Filter by Fleet ID, Zone ID, Status (ONLINE, OFFLINE, WARNING)
    - Sorting by name, last_seen, device_type, status, etc.
    """
    query = db.query(Device)

    # Search filter
    if search:
        s = f"%{search.strip()}%"
        query = query.outerjoin(Device.fleet).filter(
            or_(
                Device.device_id.ilike(s),
                Device.name.ilike(s),
                Device.location_name.ilike(s),
                Fleet.name.ilike(s)
            )
        )

    # Specific filters
    if device_type:
        query = query.filter(Device.device_type == device_type)
    if fleet_id:
        query = query.filter(Device.fleet_id == fleet_id)
    if zone_id:
        query = query.filter(Device.current_zone_id == zone_id)
    if status:
        query = query.filter(Device.status == status.upper())

    total = query.count()

    # Sorting
    order_col = Device.last_seen
    if sort_by == "name":
        order_col = Device.name
    elif sort_by == "device_id":
        order_col = Device.device_id
    elif sort_by == "device_type":
        order_col = Device.device_type
    elif sort_by == "status":
        order_col = Device.status
    elif sort_by == "created_at":
        order_col = Device.created_at

    if sort_order == "asc":
        query = query.order_by(asc(order_col))
    else:
        query = query.order_by(desc(order_col))

    # Pagination slice
    offset = (page - 1) * page_size
    devices = query.offset(offset).limit(page_size).all()
    total_pages = math.ceil(total / page_size) if total > 0 else 1

    # Global Stats across all registered devices
    all_devices = db.query(Device).all()
    total_dev = len(all_devices)
    online_dev = sum(1 for d in all_devices if d.status == "ONLINE")
    offline_dev = sum(1 for d in all_devices if d.status == "OFFLINE")
    warning_dev = sum(1 for d in all_devices if d.status == "WARNING")
    active_zones = db.query(Zone).count()

    stats = DeviceStats(
        total_devices=total_dev,
        online_devices=online_dev,
        offline_devices=offline_dev,
        warning_devices=warning_dev,
        active_zones=active_zones
    )

    items = []
    for d in devices:
        items.append(DeviceResponse.from_orm(d))

    return DevicePaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        stats=stats
    )

@router.post("", response_model=DeviceResponse, status_code=status.HTTP_201_CREATED)
def register_device(device_in: DeviceCreate, db: Session = Depends(get_db)):
    """Register a new display device into a fleet"""
    existing = get_device_by_id_str(db, device_in.device_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Device with ID '{device_in.device_id}' already exists"
        )
    return create_device(db, device_in)

@router.get("/{device_id}", response_model=DeviceDetailResponse)
def get_device(device_id: str, db: Session = Depends(get_db)):
    """
    Get deep details of a specific device including:
    - Information, Fleet, and Connection status
    - Exact location and zone
    - Current playing content with WHY/REASON explanation
    - Recent activity event logs
    """
    device = get_device_by_id_str(db, device_id)
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
    
    # Determine playing content & assignment rationale
    assignment = get_current_content(db, device)
    reason_code = assignment.get("reason", "NONE")
    playlist = assignment.get("playlist") or []
    slot_duration = assignment.get("slot_duration") or 3

    reason_human = "Default Content Fallback"
    assigned_by = "Global Display Policy"
    if reason_code == "CAMPAIGN_ROTATION":
        reason_human = "Zone Campaign Rotation (3s slots)"
        assigned_by = f"Rotating {len(playlist)} advertisements for {assignment.get('zone_name') or 'Current Zone'}"
    elif reason_code == "CAMPAIGN_BROADCAST":
        reason_human = "Active Advertiser Campaign"
        assigned_by = f"Campaign targeting {assignment.get('zone_name') or 'Current Zone'}"
    elif reason_code == "DEVICE_OVERRIDE":
        reason_human = "Device Content Override"
        assigned_by = f"Manual override set on {device.name}"
    elif reason_code == "ZONE_SCHEDULE":
        reason_human = "Active Timed Schedule"
        assigned_by = f"Schedule rule active for {assignment.get('zone_name') or 'Current Zone'}"
    elif reason_code == "ZONE_ASSIGNMENT":
        reason_human = "Zone Assignment"
        assigned_by = f"Device is currently inside {assignment.get('zone_name') or 'Detected Zone'}"

    # Fetch recent logs for this device
    logs = (
        db.query(Log)
        .filter(Log.device_id == device.device_id)
        .order_by(desc(Log.timestamp))
        .limit(25)
        .all()
    )

    base_resp = DeviceResponse.from_orm(device)
    return DeviceDetailResponse(
        **base_resp.dict(),
        assignment_reason=reason_human,
        assigned_by=assigned_by,
        recent_logs=[DeviceLogItem.from_orm(l) for l in logs],
        playlist=playlist,
        slot_duration=slot_duration
    )

@router.put("/{device_id}", response_model=DeviceResponse)
async def update_device(device_id: str, device_in: DeviceUpdate, db: Session = Depends(get_db)):
    device = get_device_by_id_str(db, device_id)
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
    
    for field, value in device_in.dict(exclude_unset=True).items():
        setattr(device, field, value)
    
    db.commit()
    db.refresh(device)
    
    # Notify device of config update via WebSocket
    await ws_manager.send_to_device(device.device_id, {
        "event": "CONFIG_UPDATED",
        "device_id": device.device_id,
        "refresh_interval": device.refresh_interval
    })
    
    return device

@router.post("/{device_id}/action")
async def execute_device_action(device_id: str, action_req: DeviceActionRequest, db: Session = Depends(get_db)):
    """Remote command dispatch (restart player, sync, trigger config update)"""
    device = get_device_by_id_str(db, device_id)
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")

    action = action_req.action
    log_msg = f"Remote Action Executed: {action.replace('_', ' ').title()}"

    # Log the action
    db.add(Log(
        device_id=device.device_id,
        event_type="REMOTE_COMMAND",
        message=log_msg,
        details_json=str(action_req.params or {})
    ))
    db.commit()

    # Send command through WebSocket
    await ws_manager.send_to_device(device.device_id, {
        "event": "COMMAND",
        "action": action,
        "device_id": device.device_id
    })

    return {"status": "success", "action": action, "device_id": device.device_id}

@router.get("/{device_id}/playlist")
def get_device_playlist_now(device_id: str, db: Session = Depends(get_db)):
    """
    Compute and return the current advertisement playlist for a device.
    This is the authoritative REST endpoint for the dashboard inspector.
    Calls the same assignment engine as WebSocket telemetry.
    """
    device = get_device_by_id_str(db, device_id)
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")

    assignment = get_current_content(db, device)
    playlist = assignment.get("playlist") or []
    return {
        "device_id": device_id,
        "zone_id": assignment.get("zone_id"),
        "zone_name": assignment.get("zone_name"),
        "reason": assignment.get("reason", "NONE"),
        "slot_duration": assignment.get("slot_duration") or 3,
        "playlist": playlist,
        "playlist_length": len(playlist),
    }


@router.get("/{device_id}/logs", response_model=List[DeviceLogItem])
def get_device_logs(device_id: str, limit: int = 50, db: Session = Depends(get_db)):
    """Retrieve audit history and telemetry events for a specific device"""
    logs = (
        db.query(Log)
        .filter(Log.device_id == device_id)
        .order_by(desc(Log.timestamp))
        .limit(limit)
        .all()
    )
    return [DeviceLogItem.from_orm(l) for l in logs]

@router.delete("/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_device(device_id: str, db: Session = Depends(get_db)):
    device = get_device_by_id_str(db, device_id)
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
    db.delete(device)
    db.commit()
    return None

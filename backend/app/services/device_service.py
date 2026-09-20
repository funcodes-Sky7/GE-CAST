import json
from datetime import datetime
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from app.models.device import Device
from app.models.fleet import Fleet
from app.models.zone import Zone
from app.models.log import Log
from app.schemas.device import DeviceCreate, DeviceUpdate
from app.core.security import generate_device_token
from app.services.geo_engine import find_zone_for_coordinates
from app.services.assignment_engine import get_current_content
from app.services.websocket_manager import ws_manager

def get_device_by_id_str(db: Session, device_id: str) -> Optional[Device]:
    return db.query(Device).filter(Device.device_id == device_id).first()

def get_device_by_token(db: Session, token: str) -> Optional[Device]:
    return db.query(Device).filter(Device.token == token).first()

def derive_human_location(lat: Optional[float], lon: Optional[float], zone_name: Optional[str]) -> str:
    """Resolve human-readable location description instead of raw coordinates"""
    if zone_name:
        return f"{zone_name} Area"
    if lat is None or lon is None:
        return "Unknown Location"
    
    # Rough regional heuristics for India hackathon waypoints
    if 28.0 <= lat <= 29.0 and 76.8 <= lon <= 77.5:
        return "Delhi NCR Transit Corridor"
    elif 30.5 <= lat <= 31.0 and 76.5 <= lon <= 77.2:
        return "Chandigarh Urban Transit"
    elif 29.0 <= lat <= 30.2 and 76.5 <= lon <= 77.2:
        return "NH44 Highway (Haryana / Karnal)"
    elif 18.5 <= lat <= 19.5 and 72.5 <= lon <= 73.2:
        return "Mumbai Coastal Express"
    elif 24.0 <= lat <= 26.0 and 73.0 <= lon <= 75.0:
        return "Western Express Transit Highway"
    return f"En route ({lat:.2f}°N, {lon:.2f}°E)"

def create_device(db: Session, data: DeviceCreate) -> Device:
    token = data.token if data.token else generate_device_token()
    device = Device(
        device_id=data.device_id,
        name=data.name,
        token=token,
        device_type=data.device_type or "BUS",
        fleet_id=data.fleet_id,
        location_name=data.location_name or "Registered Station",
        refresh_interval=data.refresh_interval or 10,
        default_content_id=data.default_content_id,
        override_content_id=data.override_content_id,
        status="OFFLINE"
    )
    db.add(device)
    db.commit()
    db.refresh(device)

    # Add initial registration log
    log_entry = Log(
        device_id=device.device_id,
        event_type="DEVICE_REGISTERED",
        message=f"Device {device.device_id} ({device.name}) registered in fleet",
        details_json=json.dumps({"device_type": device.device_type, "fleet_id": device.fleet_id}),
        timestamp=datetime.utcnow()
    )
    db.add(log_entry)
    db.commit()

    return device

async def process_device_telemetry(
    db: Session,
    device: Device,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None
) -> Dict[str, Any]:
    """
    Central Core Flow:
    Device Simulator / Display
    -> GPS coordinates & Heartbeat
    -> FastAPI
    -> PostGIS / Geo Engine
    -> Zone detection
    -> Assignment engine decision
    -> Selected content
    -> WebSocket push (if content changed)
    -> Broadcast to live map
    """
    now = datetime.utcnow()
    previous_status = device.status
    previous_zone_id = device.current_zone_id
    previous_content_id = device.active_content_id
    
    # Update device telemetry
    device.last_seen = now
    device.status = "ONLINE"
    
    if latitude is not None and longitude is not None:
        device.current_lat = latitude
        device.current_lon = longitude

    # 1. PostGIS Zone Detection
    detected_zone = None
    if device.current_lat is not None and device.current_lon is not None:
        detected_zone = find_zone_for_coordinates(db, device.current_lat, device.current_lon)
        device.current_zone_id = detected_zone.id if detected_zone else None

    # Derive human-friendly location string
    device.location_name = derive_human_location(
        device.current_lat,
        device.current_lon,
        detected_zone.name if detected_zone else None
    )

    # Status change log
    if previous_status != "ONLINE":
        db.add(Log(
            device_id=device.device_id,
            event_type="DEVICE_ONLINE",
            message=f"Device {device.device_id} established connection (Online)",
            timestamp=now
        ))

    # Log zone transition if zone changed
    if detected_zone and detected_zone.id != previous_zone_id:
        log_entry = Log(
            device_id=device.device_id,
            event_type="ZONE_TRANSITION",
            message=f"Device {device.device_id} entered zone: {detected_zone.name}",
            details_json=json.dumps({
                "from_zone_id": previous_zone_id,
                "to_zone_id": detected_zone.id,
                "lat": device.current_lat,
                "lon": device.current_lon,
                "location": device.location_name
            }),
            timestamp=now
        )
        db.add(log_entry)
    elif not detected_zone and previous_zone_id is not None:
        log_entry = Log(
            device_id=device.device_id,
            event_type="ZONE_TRANSITION",
            message=f"Device {device.device_id} exited zone into transit area",
            details_json=json.dumps({"from_zone_id": previous_zone_id, "to_zone_id": None}),
            timestamp=now
        )
        db.add(log_entry)

    # 2. Assignment Engine Decision
    assignment = get_current_content(db, device, (device.current_lat, device.current_lon) if device.current_lat else None, now)
    selected_content_id = assignment["content_id"]
    selected_content = assignment["content"]
    reason = assignment["reason"]

    # 3. Check if active content changed
    content_changed = (selected_content_id != previous_content_id)
    if content_changed:
        device.active_content_id = selected_content_id
        content_title = selected_content.title if selected_content else "Default Fallback"
        log_entry = Log(
            device_id=device.device_id,
            event_type="CONTENT_TRANSITION",
            message=f"Content changed → '{content_title}' (Reason: {reason})",
            details_json=json.dumps({
                "previous_content_id": previous_content_id,
                "new_content_id": selected_content_id,
                "reason": reason,
                "zone_id": assignment.get("zone_id")
            }),
            timestamp=now
        )
        db.add(log_entry)
    else:
        # Periodic location update log
        db.add(Log(
            device_id=device.device_id,
            event_type="LOCATION_UPDATED",
            message=f"Telemetry: Location updated to {device.location_name}",
            details_json=json.dumps({"lat": device.current_lat, "lon": device.current_lon}),
            timestamp=now
        ))

    db.commit()
    db.refresh(device)

    # 4. If content changed, push immediate WebSocket update to device
    content_payload = None
    if selected_content:
        content_payload = {
            "id": selected_content.id,
            "title": selected_content.title,
            "file_url": selected_content.file_url,
            "media_type": selected_content.media_type,
            "duration": selected_content.duration
        }

    if content_changed:
        await ws_manager.send_to_device(device.device_id, {
            "event": "CONTENT_UPDATED",
            "type": "CONTENT_UPDATE",
            "device_id": device.device_id,
            "content_id": selected_content_id,
            "content_url": selected_content.file_url if selected_content else None,
            "reason": reason,
            "zone_id": assignment.get("zone_id"),
            "zone_name": assignment.get("zone_name"),
            "content": content_payload
        })

    # 5. Broadcast to dashboard live map & overview
    await ws_manager.broadcast_to_dashboard({
        "event": "DEVICE_TELEMETRY",
        "type": "LOCATION_UPDATED",
        "device_id": device.device_id,
        "name": device.name,
        "device_type": device.device_type,
        "fleet_name": device.fleet.name if device.fleet else None,
        "latitude": device.current_lat,
        "longitude": device.current_lon,
        "location_name": device.location_name,
        "status": device.status,
        "current_zone": assignment.get("zone_name"),
        "zone_name": assignment.get("zone_name"),
        "active_content_title": selected_content.title if selected_content else None,
        "active_content_url": selected_content.file_url if selected_content else None,
        "reason": reason,
        "last_seen": now.isoformat()
    })

    return {
        "device_id": device.device_id,
        "content_id": selected_content_id,
        "content": content_payload,
        "reason": reason,
        "zone_id": assignment.get("zone_id"),
        "zone_name": assignment.get("zone_name"),
        "timestamp": now.isoformat()
    }

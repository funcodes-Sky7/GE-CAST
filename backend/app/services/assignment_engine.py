from datetime import datetime
from typing import Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from app.models.device import Device
from app.models.content import Content
from app.models.zone import Zone
from app.services.geo_engine import find_zone_for_coordinates
from app.services.schedule_service import (
    get_active_schedules_for_zone,
    get_active_schedules_for_device,
)

def get_current_content(
    db: Session,
    device: Device,
    location: Optional[Tuple[float, float]] = None,
    current_time: Optional[datetime] = None
) -> Dict[str, Any]:
    """
    Decision pipeline:
    device
    -> current location
    -> current zone
    -> active schedule
    -> zone/content assignment
    -> optional device override
    -> default content if nothing else applies.
    
    Returns:
    {
        "content_id": int or None,
        "content": Content or None,
        "reason": "ZONE_SCHEDULE" | "DEVICE_SCHEDULE" | "ZONE_ASSIGNMENT" | "DEVICE_OVERRIDE" | "DEFAULT_FALLBACK" | "NONE",
        "zone_id": int or None,
        "zone_name": str or None
    }
    """
    if current_time is None:
        current_time = datetime.utcnow()
        
    lat = location[0] if location else device.current_lat
    lon = location[1] if location else device.current_lon
    
    # 1. Location & Zone detection
    current_zone: Optional[Zone] = None
    if lat is not None and lon is not None:
        current_zone = find_zone_for_coordinates(db, lat, lon)
    
    # 2. Check active schedule for the detected zone
    if current_zone:
        zone_schedules = get_active_schedules_for_zone(db, current_zone.id, current_time)
        if zone_schedules:
            top_schedule = zone_schedules[0] # Highest priority
            if top_schedule.content:
                return {
                    "content_id": top_schedule.content_id,
                    "content": top_schedule.content,
                    "reason": "ZONE_SCHEDULE",
                    "zone_id": current_zone.id,
                    "zone_name": current_zone.name
                }
        
        # 3. Zone content assignment
        if current_zone.assigned_content:
            return {
                "content_id": current_zone.assigned_content_id,
                "content": current_zone.assigned_content,
                "reason": "ZONE_ASSIGNMENT",
                "zone_id": current_zone.id,
                "zone_name": current_zone.name
            }

    # 4. Active schedule directly targeting this device
    device_schedules = get_active_schedules_for_device(db, device.id, current_time)
    if device_schedules:
        top_dev_sched = device_schedules[0]
        if top_dev_sched.content:
            return {
                "content_id": top_dev_sched.content_id,
                "content": top_dev_sched.content,
                "reason": "DEVICE_SCHEDULE",
                "zone_id": current_zone.id if current_zone else None,
                "zone_name": current_zone.name if current_zone else None
            }

    # 5. Optional device override
    if device.override_content:
        return {
            "content_id": device.override_content_id,
            "content": device.override_content,
            "reason": "DEVICE_OVERRIDE",
            "zone_id": current_zone.id if current_zone else None,
            "zone_name": current_zone.name if current_zone else None
        }

    # 6. Default fallback content
    if device.default_content:
        return {
            "content_id": device.default_content_id,
            "content": device.default_content,
            "reason": "DEFAULT_FALLBACK",
            "zone_id": current_zone.id if current_zone else None,
            "zone_name": current_zone.name if current_zone else None
        }

    # Any network default content if exists
    fallback = db.query(Content).first()
    if fallback:
        return {
            "content_id": fallback.id,
            "content": fallback,
            "reason": "DEFAULT_FALLBACK",
            "zone_id": current_zone.id if current_zone else None,
            "zone_name": current_zone.name if current_zone else None
        }

    return {
        "content_id": None,
        "content": None,
        "reason": "NONE",
        "zone_id": current_zone.id if current_zone else None,
        "zone_name": current_zone.name if current_zone else None
    }

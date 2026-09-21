from datetime import datetime
import math
from functools import reduce
from typing import Optional, Tuple, Dict, Any, List
from sqlalchemy.orm import Session
from app.models.device import Device
from app.models.content import Content
from app.models.zone import Zone
from app.models.campaign import Campaign
from app.services.geo_engine import find_zone_for_coordinates
from app.services.schedule_service import (
    get_active_schedules_for_zone,
    get_active_schedules_for_device,
)

# ── Configurable Constants ────────────────────────────────────────────────
AD_SLOT_DURATION = 3  # Slot duration in seconds (3-second rotation)


def is_device_type_compatible(device_type: Optional[str], allowed_types_str: Optional[str]) -> bool:
    """Check if a physical device's type matches campaign's targeted device categories."""
    if not allowed_types_str or not allowed_types_str.strip():
        return True
    allowed = [t.strip().upper() for t in allowed_types_str.split(",") if t.strip()]
    dev = (device_type or "").upper()
    
    if dev in allowed:
        return True
    if dev in ["BILLBOARD", "LED_SCREEN", "DIGITAL_SIGNAGE"] and any(t in allowed for t in ["BILLBOARD", "LED_SCREEN", "DIGITAL_SIGNAGE"]):
        return True
    if dev in ["TRAIN", "METRO"] and any(t in allowed for t in ["TRAIN", "METRO"]):
        return True
    if dev == "BUS" and "BUS" in allowed:
        return True
    if dev == "STATION" and "STATION" in allowed:
        return True
    if dev == "KIOSK" and "KIOSK" in allowed:
        return True
    return False


def is_zone_targeted(zone_ids_str: Optional[str], current_zone: Optional[Zone], all_zones_dict: Dict[int, Zone]) -> bool:
    """
    Check if a Content record or Campaign targets the current zone.
    Supports:
    - Comma-separated zone IDs (e.g. "2,6,3,11")
    - Comma-separated zone / city names (e.g. "Delhi, Mumbai")
    - Keyword "ALL" / "GLOBAL" / "*"
    - City name normalization (e.g. 'Delhi' matches 'Delhi NCR Zone')
    Note: If zone_ids_str is empty/None, returns False (unassigned content does not bleed into all zones).
    """
    if not current_zone:
        return False
    if not zone_ids_str or not str(zone_ids_str).strip():
        return False
        
    clean_str = str(zone_ids_str).strip()
    if clean_str.upper() in ["ALL", "*", "GLOBAL", "ALL ZONES"]:
        return True
        
    target_ids = {int(x.strip()) for x in clean_str.split(",") if x.strip().isdigit()}
    if current_zone.id in target_ids:
        return True
        
    def normalize_name(n: str) -> str:
        s = n.lower()
        for suffix in ["zone", "ncr", "metro", "city", "area", "region"]:
            s = s.replace(suffix, "")
        return s.strip()

    current_norm = normalize_name(current_zone.name)
    for tid in target_ids:
        tz = all_zones_dict.get(tid)
        if tz:
            tz_norm = normalize_name(tz.name)
            if current_norm and tz_norm and (current_norm == tz_norm or current_norm in tz_norm or tz_norm in current_norm):
                return True

    # Also match direct city names in string, e.g. "Delhi, Mumbai"
    for part in clean_str.split(","):
        p_norm = normalize_name(part.strip())
        if p_norm and (p_norm == current_norm or p_norm in current_norm or current_norm in p_norm):
            return True

    return False


def generate_weighted_playlist(campaign_items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Deterministic, priority-ordered playlist of eligible advertisements.
    Each unique eligible content item appears once in the playlist, sorted by priority (10 to 1)
    so the device/player can cleanly rotate each item for AD_SLOT_DURATION (3 seconds).
    """
    if not campaign_items:
        return []
    
    # Deduplicate by content_id while preserving highest priority
    seen: Dict[int, Dict[str, Any]] = {}
    for item in campaign_items:
        cid = item.get("content_id")
        if cid is not None:
            if cid not in seen or (item.get("priority") or 5) > (seen[cid].get("priority") or 5):
                seen[cid] = item
        else:
            seen[id(item)] = item

    # Sort items by priority descending, then content_id ascending for deterministic order
    ordered = sorted(
        seen.values(),
        key=lambda x: (-(x.get("priority") or 5), x.get("content_id") or 0)
    )
    return ordered


def get_device_playlist(
    db: Session,
    device: Device,
    location: Optional[Tuple[float, float]] = None,
    current_time: Optional[datetime] = None
) -> Dict[str, Any]:
    """
    Generates a deterministic, device-specific advertisement playlist.
    
    Pipeline:
    1. GPS Coordinates -> Current Zone (PostGIS / Shapely)
    2. Optional Device Override (Admin direct override)
    3. Active Device-Specific Schedule
    4. Active Zone Schedule
    5. Active Advertiser Campaigns matching Current Zone & Device Type:
       - Multi-zone campaign support
       - Deterministic priority-weighted rotation (AD_SLOT_DURATION = 3s)
    6. Zone Assigned Static Content
    7. Device Default Fallback
    8. Network Global Fallback
    """
    if current_time is None:
        current_time = datetime.utcnow()
        
    current_zone: Optional[Zone] = None
    lat = None
    lon = None

    if isinstance(location, Zone):
        current_zone = location
        lat = location.center_lat
        lon = location.center_lon
    elif location and isinstance(location, (tuple, list)) and len(location) >= 2:
        lat = location[0]
        lon = location[1]
    else:
        lat = device.current_lat
        lon = device.current_lon

    # 1. Location & Zone detection
    if not current_zone and lat is not None and lon is not None:
        current_zone = find_zone_for_coordinates(db, lat, lon)
    if not current_zone and getattr(device, "current_zone", None):
        current_zone = device.current_zone
        
    all_zones = {z.id: z for z in db.query(Zone).all()}

    # 2. Optional Device Override (Highest manual priority)
    if device.override_content:
        item = {
            "campaign_id": None,
            "content_id": device.override_content_id,
            "title": device.override_content.title,
            "file_url": device.override_content.file_url,
            "media_type": device.override_content.media_type or "image",
            "duration": AD_SLOT_DURATION,
            "priority": 10,
            "description": device.override_content.description
        }
        return {
            "content_id": device.override_content_id,
            "content": device.override_content,
            "playlist": [item],
            "slot_duration": AD_SLOT_DURATION,
            "reason": "DEVICE_OVERRIDE",
            "zone_id": current_zone.id if current_zone else None,
            "zone_name": current_zone.name if current_zone else None
        }

    # 3. Active schedule directly targeting this device
    device_schedules = get_active_schedules_for_device(db, device.id, current_time)
    if device_schedules:
        top_dev_sched = device_schedules[0]
        if top_dev_sched.content:
            item = {
                "campaign_id": None,
                "content_id": top_dev_sched.content_id,
                "title": top_dev_sched.content.title,
                "file_url": top_dev_sched.content.file_url,
                "media_type": top_dev_sched.content.media_type or "image",
                "duration": AD_SLOT_DURATION,
                "priority": top_dev_sched.priority or 5,
                "description": top_dev_sched.content.description
            }
            return {
                "content_id": top_dev_sched.content_id,
                "content": top_dev_sched.content,
                "playlist": [item],
                "slot_duration": AD_SLOT_DURATION,
                "reason": "DEVICE_SCHEDULE",
                "zone_id": current_zone.id if current_zone else None,
                "zone_name": current_zone.name if current_zone else None
            }

    # 4. Authoritative Content Resolution for Current Zone (Content Page is Source of Truth)
    if current_zone:
        eligible_items = get_eligible_content_for_zone(db, current_zone, device=device, current_time=current_time)
        if eligible_items:
            playlist = generate_weighted_playlist(eligible_items)
            first_item = playlist[0]
            first_content = db.query(Content).filter(Content.id == first_item["content_id"]).first()
            return {
                "content_id": first_item["content_id"],
                "content": first_content,
                "playlist": playlist,
                "slot_duration": AD_SLOT_DURATION,
                "reason": "CAMPAIGN_ROTATION" if len(eligible_items) > 1 else "CAMPAIGN_BROADCAST",
                "zone_id": current_zone.id,
                "zone_name": current_zone.name
            }

    # 5. Device Default Fallback Content
    if device.default_content:
        item = {
            "campaign_id": None,
            "content_id": device.default_content_id,
            "title": device.default_content.title,
            "file_url": device.default_content.file_url,
            "media_type": device.default_content.media_type or "image",
            "duration": AD_SLOT_DURATION,
            "priority": 1,
            "description": device.default_content.description
        }
        return {
            "content_id": device.default_content_id,
            "content": device.default_content,
            "playlist": [item],
            "slot_duration": AD_SLOT_DURATION,
            "reason": "DEFAULT_FALLBACK",
            "zone_id": current_zone.id if current_zone else None,
            "zone_name": current_zone.name if current_zone else None
        }

    # 6. Global Network Default Content (marked is_default=True, or first legitimate content)
    fallback = db.query(Content).filter(Content.is_default == True).first()
    if not fallback:
        fallback = db.query(Content).first()
    if fallback:
        item = {
            "campaign_id": None,
            "content_id": fallback.id,
            "title": fallback.title,
            "file_url": fallback.file_url,
            "media_type": fallback.media_type or "image",
            "duration": AD_SLOT_DURATION,
            "priority": 1,
            "description": fallback.description
        }
        return {
            "content_id": fallback.id,
            "content": fallback,
            "playlist": [item],
            "slot_duration": AD_SLOT_DURATION,
            "reason": "DEFAULT_FALLBACK",
            "zone_id": current_zone.id if current_zone else None,
            "zone_name": current_zone.name if current_zone else None
        }

    return {
        "content_id": None,
        "content": None,
        "playlist": [],
        "slot_duration": AD_SLOT_DURATION,
        "reason": "NONE",
        "zone_id": current_zone.id if current_zone else None,
        "zone_name": current_zone.name if current_zone else None
    }


def get_eligible_content_for_zone(
    db: Session,
    zone: Zone,
    device: Optional[Device] = None,
    current_time: Optional[datetime] = None
) -> List[Dict[str, Any]]:
    """
    AUTHORITATIVE BACKEND ELIGIBILITY PIPELINE.
    Evaluates the Content table as the SINGLE SOURCE OF TRUTH for device ad rotation.
    
    Eligibility rules:
    1. Content exists in database (`contents` table).
    2. Content is active (`is_active == True` / 1).
    3. Content is not default fallback (`is_default == False`).
    4. Content has valid media (`file_url` is not empty).
    5. Content targets the zone:
       - via `content.zone_ids` matching zone ID, city name, or 'ALL'
       - or static zone assignment (`zone.assigned_content_id == content.id`)
       - or active Schedule in this zone targeting `content.id`
       - or linked active Campaign targeting this zone
    6. If linked to a Campaign:
       - Campaign must be active
       - Current time must be within campaign start_date and end_date
       - If device specified, device.device_type must be compatible with campaign.device_types
    7. Priority resolved: Schedule priority > Campaign priority > Content priority (default 5).
    """
    if current_time is None:
        current_time = datetime.utcnow()
        
    all_zones = {z.id: z for z in db.query(Zone).all()}
    active_zone_schedules = get_active_schedules_for_zone(db, zone.id, current_time)
    scheduled_content_priorities = {s.content_id: (s.priority or 5) for s in active_zone_schedules if s.content_id}
    
    # Query all active, non-default Content records
    candidate_contents = db.query(Content).filter(
        Content.is_active.isnot(False),
        Content.is_default.isnot(True)
    ).all()
    
    eligible_items = []
    
    for content in candidate_contents:
        if not content.file_url:
            continue
            
        # Check linked campaign validity if present
        camp = None
        campaign_status_ok = True  # gates from campaign status/dates
        content_has_direct_zones = bool(content.zone_ids and content.zone_ids.strip())
        if content.campaign_id:
            camp = db.query(Campaign).filter(Campaign.id == content.campaign_id).first()
            if not camp:
                # Linked campaign was deleted — do not serve orphaned campaign content
                continue

            camp_status = (camp.status or "").lower()
            # Explicitly paused, cancelled or archived campaigns are never served
            if camp_status in ["paused", "cancelled", "archived"]:
                continue

            # Device type compatibility check:
            # If content has direct zone targeting in the Content Library, all display types
            # stationed in that designated zone can play the creative.
            # If not direct, strictly enforce the campaign device_types filter.
            if device and camp.device_types:
                if not is_device_type_compatible(device.device_type, camp.device_types) and not content_has_direct_zones:
                    continue

            # Expiration check: if campaign is explicitly active, do not hard-block it;
            # otherwise mark as inactive/soft-blocked
            if camp.end_date and current_time > camp.end_date:
                if camp_status != "active":
                    campaign_status_ok = False

            if camp_status not in ["active", "scheduled"]:
                campaign_status_ok = False
            if camp.start_date and current_time < camp.start_date:
                campaign_status_ok = False

        # Zone targeting check
        matched = False
        
        # 1. Content zone_ids directly targeting this zone
        if is_zone_targeted(content.zone_ids, zone, all_zones):
            matched = True
            
        # 2. Zone static assignment
        if not matched and zone.assigned_content_id == content.id:
            matched = True
            
        # 3. Active schedule in zone targeting this content
        if not matched and content.id in scheduled_content_priorities:
            matched = True
            
        # 4. Linked campaign zone_ids (only when campaign is active/scheduled)
        if not matched and camp and campaign_status_ok and is_zone_targeted(camp.zone_ids, zone, all_zones):
            matched = True
            
        if not matched:
            continue

        # If campaign is soft-blocked (draft/not-started) and content only
        # matched via campaign zone_ids — skip it; campaigns must be active to serve.
        # But if content has its own zone_ids set (placed directly by sync_campaign_content),
        # we serve it as the Content Library is the authoritative source of truth.
        if camp and not campaign_status_ok and not content_has_direct_zones:
            continue


            
        # Determine effective priority
        effective_priority = content.priority or 5
        if content.id in scheduled_content_priorities:
            effective_priority = max(effective_priority, scheduled_content_priorities[content.id])
        elif camp and camp.priority:
            effective_priority = max(effective_priority, camp.priority)
            
        url_lower = (content.file_url or "").lower()
        is_video = any(url_lower.endswith(ext) for ext in [".mp4", ".mov", ".avi", ".webm", ".mkv"]) or \
                   (bool(content.media_type) and "video" in content.media_type.lower())
        media_type = "video" if is_video else "image"
        
        eligible_items.append({
            "content_id": content.id,
            "campaign_id": content.campaign_id or (camp.id if camp else None),
            "title": content.title,
            "file_url": content.file_url,
            "media_type": media_type,
            "duration": AD_SLOT_DURATION,
            "priority": effective_priority,
            "description": content.description or "",
            "zone_ids": content.zone_ids,
        })
        
    return eligible_items


def get_eligible_content_for_device(
    db: Session,
    device_id: str,
    current_time: Optional[datetime] = None
) -> Dict[str, Any]:
    """Exposes authoritative device playlist and eligible content for any API or inspector."""
    from app.services.device_service import get_device_by_id_str
    device = get_device_by_id_str(db, device_id)
    if not device:
        return {
            "content_id": None,
            "content": None,
            "playlist": [],
            "slot_duration": AD_SLOT_DURATION,
            "reason": "DEVICE_NOT_FOUND",
            "zone_id": None,
            "zone_name": None
        }
    return get_device_playlist(db, device, current_time=current_time)


def get_current_content(
    db: Session,
    device: Device,
    location: Optional[Tuple[float, float]] = None,
    current_time: Optional[datetime] = None
) -> Dict[str, Any]:
    """Backward-compatible entry point that generates the device playlist and top content."""
    return get_device_playlist(db, device, location, current_time)


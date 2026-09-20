from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.device import Device
from app.models.zone import Zone
from app.models.content import Content
from app.models.schedule import Schedule
from app.models.log import Log
from app.schemas.dashboard import DashboardOverview, AuditLogResponse, ZoneStatResponse

router = APIRouter(prefix="/dashboard", tags=["Dashboard (Admin)"])

@router.get("/overview", response_model=DashboardOverview)
def get_dashboard_overview(db: Session = Depends(get_db)):
    """
    Returns real-time network health and entity counts matching dashboard wireframe:
    - Total Devices
    - Online Devices
    - Offline Devices
    - Total Zones
    - Total Contents
    - Active Schedules
    """
    total_devices = db.query(Device).count()
    online_devices = db.query(Device).filter(Device.status == "ONLINE").count()
    offline_devices = db.query(Device).filter(Device.status == "OFFLINE").count()
    total_zones = db.query(Zone).count()
    total_contents = db.query(Content).count()
    
    now = datetime.utcnow()
    active_schedules = db.query(Schedule).filter(
        Schedule.is_active == True,
        Schedule.start_time <= now,
        Schedule.end_time >= now
    ).count()

    return DashboardOverview(
        total_devices=total_devices,
        online_devices=online_devices,
        offline_devices=offline_devices,
        total_zones=total_zones,
        total_contents=total_contents,
        active_schedules=active_schedules
    )

@router.get("/zone-stats", response_model=List[ZoneStatResponse])
def get_zone_stats(db: Session = Depends(get_db)):
    """Retrieve device counts per zone"""
    zones = db.query(Zone).all()
    results = []
    for z in zones:
        total_cnt = db.query(Device).filter(Device.current_zone_id == z.id).count()
        online_cnt = db.query(Device).filter(
            Device.current_zone_id == z.id,
            Device.status == "ONLINE"
        ).count()
        results.append(ZoneStatResponse(
            zone_id=z.id,
            name=z.name,
            color=z.color or "#3b82f6",
            device_count=total_cnt,
            online_count=online_cnt
        ))
    return results


@router.get("/logs", response_model=List[AuditLogResponse])
def get_audit_logs(limit: int = 50, db: Session = Depends(get_db)):
    """Retrieve audit and telemetry history logs (transitions, check-ins, disconnects)"""
    return db.query(Log).order_by(Log.timestamp.desc()).limit(limit).all()


from datetime import datetime
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.schedule import Schedule

def get_active_schedules_for_zone(db: Session, zone_id: int, current_time: datetime) -> List[Schedule]:
    """Find active schedules targeting a specific zone at the given timestamp, ordered by priority desc"""
    return db.query(Schedule).filter(
        Schedule.zone_id == zone_id,
        Schedule.is_active == True,
        Schedule.start_time <= current_time,
        Schedule.end_time >= current_time
    ).order_by(Schedule.priority.desc()).all()

def get_active_schedules_for_device(db: Session, device_id: int, current_time: datetime) -> List[Schedule]:
    """Find active schedules targeting a specific device at the given timestamp, ordered by priority desc"""
    return db.query(Schedule).filter(
        Schedule.device_id == device_id,
        Schedule.is_active == True,
        Schedule.start_time <= current_time,
        Schedule.end_time >= current_time
    ).order_by(Schedule.priority.desc()).all()

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.fleet import Fleet
from app.schemas.fleet import FleetCreate, FleetResponse

router = APIRouter(prefix="/fleets", tags=["Fleets"])

@router.get("", response_model=List[FleetResponse])
def list_fleets(db: Session = Depends(get_db)):
    """List all fleets with device counts"""
    fleets = db.query(Fleet).all()
    results = []
    for f in fleets:
        resp = FleetResponse(
            id=f.id,
            name=f.name,
            organization=f.organization,
            device_type=f.device_type,
            created_at=f.created_at,
            device_count=len(f.devices) if f.devices else 0
        )
        results.append(resp)
    return results

@router.post("", response_model=FleetResponse, status_code=status.HTTP_201_CREATED)
def create_fleet(fleet_in: FleetCreate, db: Session = Depends(get_db)):
    """Create a new fleet"""
    existing = db.query(Fleet).filter(Fleet.name == fleet_in.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Fleet with name '{fleet_in.name}' already exists"
        )
    fleet = Fleet(
        name=fleet_in.name,
        organization=fleet_in.organization,
        device_type=fleet_in.device_type
    )
    db.add(fleet)
    db.commit()
    db.refresh(fleet)
    return FleetResponse(
        id=fleet.id,
        name=fleet.name,
        organization=fleet.organization,
        device_type=fleet.device_type,
        created_at=fleet.created_at,
        device_count=0
    )

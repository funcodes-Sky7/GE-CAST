import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from geoalchemy2 import WKTElement
from app.db.session import get_db
from app.models.zone import Zone
from app.schemas.zone import ZoneCreate, ZoneUpdate, ZoneResponse
from app.services.geo_engine import create_circle_polygon_wkt, create_polygon_wkt_from_coords

router = APIRouter(prefix="/zones", tags=["Zones Management (PostGIS)"])

from app.core.config import settings

def build_zone_geometry(zone_type: str, center_lat: float, center_lon: float, radius_meters: float, coordinates_json: str):
    """Build geometry representation for PostGIS / DB insertion"""
    try:
        wkt = None
        if zone_type == "circle" and center_lat is not None and center_lon is not None and radius_meters:
            wkt = create_circle_polygon_wkt(center_lat, center_lon, radius_meters)
        elif zone_type == "polygon" and coordinates_json:
            coords = json.loads(coordinates_json)
            wkt = create_polygon_wkt_from_coords(coords)
            
        if wkt:
            if settings.DATABASE_URL.startswith("postgresql"):
                return WKTElement(wkt, srid=4326)
            return wkt
    except Exception:
        pass
    return None

@router.get("", response_model=List[ZoneResponse])
def list_zones(db: Session = Depends(get_db)):
    """List all geographical zones"""
    return db.query(Zone).all()

@router.post("", response_model=ZoneResponse, status_code=status.HTTP_201_CREATED)
def create_zone(zone_in: ZoneCreate, db: Session = Depends(get_db)):
    """Create a new geographical zone with PostGIS geometry (Circle or Polygon)"""
    existing = db.query(Zone).filter(Zone.name == zone_in.name).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Zone '{zone_in.name}' already exists")
    
    geom = build_zone_geometry(
        zone_in.zone_type,
        zone_in.center_lat,
        zone_in.center_lon,
        zone_in.radius_meters,
        zone_in.coordinates_json
    )
    
    zone = Zone(
        name=zone_in.name,
        description=zone_in.description,
        zone_type=zone_in.zone_type,
        center_lat=zone_in.center_lat,
        center_lon=zone_in.center_lon,
        radius_meters=zone_in.radius_meters,
        coordinates_json=zone_in.coordinates_json,
        assigned_content_id=zone_in.assigned_content_id,
        color=zone_in.color or "#3b82f6",
        geom=geom
    )
    db.add(zone)
    db.commit()
    db.refresh(zone)
    return zone

@router.get("/{zone_id}", response_model=ZoneResponse)
def get_zone(zone_id: int, db: Session = Depends(get_db)):
    zone = db.query(Zone).filter(Zone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Zone not found")
    return zone

@router.put("/{zone_id}", response_model=ZoneResponse)
def update_zone(zone_id: int, zone_in: ZoneUpdate, db: Session = Depends(get_db)):
    """Update zone coordinates, geometry, or assigned content"""
    zone = db.query(Zone).filter(Zone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Zone not found")
    
    update_data = zone_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(zone, field, value)

    # Rebuild geometry if spatial attributes changed
    zone.geom = build_zone_geometry(
        zone.zone_type,
        zone.center_lat,
        zone.center_lon,
        zone.radius_meters,
        zone.coordinates_json
    )

    db.commit()
    db.refresh(zone)
    return zone

@router.delete("/{zone_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_zone(zone_id: int, db: Session = Depends(get_db)):
    zone = db.query(Zone).filter(Zone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Zone not found")
    db.delete(zone)
    db.commit()
    return None

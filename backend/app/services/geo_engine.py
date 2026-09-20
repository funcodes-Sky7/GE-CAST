import json
import math
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import text
from shapely.geometry import Point, Polygon
from app.models.zone import Zone

def create_circle_polygon_wkt(lat: float, lon: float, radius_meters: float, num_points: int = 32) -> str:
    """Generate WKT Polygon approximating a circle given lat, lon, and radius in meters"""
    # 1 degree lat approx 111,320 meters
    lat_deg_per_meter = 1.0 / 111320.0
    lon_deg_per_meter = 1.0 / (111320.0 * math.cos(math.radians(lat)))
    
    points = []
    for i in range(num_points):
        angle = (2 * math.pi * i) / num_points
        dx = radius_meters * math.cos(angle)
        dy = radius_meters * math.sin(angle)
        pt_lon = lon + (dx * lon_deg_per_meter)
        pt_lat = lat + (dy * lat_deg_per_meter)
        points.append(f"{pt_lon} {pt_lat}")
    
    # Close the polygon ring
    points.append(points[0])
    return f"POLYGON(({', '.join(points)}))"

def create_polygon_wkt_from_coords(coords: List[List[float]]) -> str:
    """
    Given [[lat1, lon1], [lat2, lon2], ...],
    Generate WKT format: POLYGON((lon1 lat1, lon2 lat2, ...))
    """
    points = [f"{pt[1]} {pt[0]}" for pt in coords]
    if points[0] != points[-1]:
        points.append(points[0]) # ensure closed ring
    return f"POLYGON(({', '.join(points)}))"

def find_zone_for_coordinates(db: Session, lat: float, lon: float) -> Optional[Zone]:
    """
    Core flow: device coordinates -> PostGIS -> current zone.
    Queries PostGIS using spatial function ST_Contains when on PostgreSQL.
    Uses Shapely geometry when on SQLite/local DB.
    When multiple zones match (e.g. Airport inside City), the most specific (smallest area/radius) zone takes priority.
    """
    # 1. Native PostGIS query if connected to PostgreSQL
    dialect_name = db.bind.dialect.name if db.bind else ""
    if dialect_name == "postgresql":
        try:
            query = text("""
                SELECT id FROM zones 
                WHERE geom IS NOT NULL 
                AND ST_Contains(geom, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326))
                ORDER BY ST_Area(geom) ASC, id ASC
                LIMIT 1
            """)
            result = db.execute(query, {"lon": lon, "lat": lat}).fetchone()
            if result:
                return db.query(Zone).filter(Zone.id == result[0]).first()
        except Exception:
            db.rollback()
    
    # 2. Geometric / Shapely evaluation (Circles & Polygons)
    point = Point(lon, lat)
    all_zones = db.query(Zone).all()
    matching_zones = []

    for zone in all_zones:
        if zone.zone_type == "circle" and zone.center_lat is not None and zone.center_lon is not None and zone.radius_meters:
            # Haversine distance check in meters
            d_lat = math.radians(lat - zone.center_lat)
            d_lon = math.radians(lon - zone.center_lon)
            a = math.sin(d_lat / 2)**2 + math.cos(math.radians(zone.center_lat)) * math.cos(math.radians(lat)) * math.sin(d_lon / 2)**2
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
            distance_meters = 6371000 * c
            if distance_meters <= zone.radius_meters:
                area = math.pi * (zone.radius_meters ** 2)
                matching_zones.append((area, zone))
        elif zone.zone_type == "polygon" and zone.coordinates_json:
            try:
                coords = json.loads(zone.coordinates_json)
                poly_coords = [(pt[1], pt[0]) for pt in coords]
                poly = Polygon(poly_coords)
                if poly.contains(point):
                    matching_zones.append((poly.area * 1e10, zone))
            except Exception:
                continue

    if matching_zones:
        # Sort by area ascending so most specific (smallest) geofence takes precedence
        matching_zones.sort(key=lambda x: x[0])
        return matching_zones[0][1]

    return None

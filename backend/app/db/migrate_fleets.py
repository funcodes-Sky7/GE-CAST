import sqlite3
import os
from datetime import datetime
from app.db.session import engine, Base
import app.db.base
from app.models.fleet import Fleet
from app.models.device import Device
from app.models.zone import Zone
from app.models.content import Content
from sqlalchemy.orm import sessionmaker

def migrate_and_seed():
    print("[Migration] Ensuring all tables are created...")
    Base.metadata.create_all(bind=engine)

    # If SQLite, check and add columns if missing
    db_path = "./geocast.db"
    if os.path.exists(db_path):
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        
        # Check devices table columns
        cur.execute("PRAGMA table_info(devices)")
        cols = [row[1] for row in cur.fetchall()]
        
        if "device_type" not in cols:
            print("[Migration] Adding device_type column to devices...")
            cur.execute("ALTER TABLE devices ADD COLUMN device_type VARCHAR(50) DEFAULT 'BUS'")
            
        if "fleet_id" not in cols:
            print("[Migration] Adding fleet_id column to devices...")
            cur.execute("ALTER TABLE devices ADD COLUMN fleet_id INTEGER REFERENCES fleets(id)")
            
        if "location_name" not in cols:
            print("[Migration] Adding location_name column to devices...")
            cur.execute("ALTER TABLE devices ADD COLUMN location_name VARCHAR(255)")
            
        conn.commit()
        conn.close()

    Session = sessionmaker(bind=engine)
    db = Session()

    # 1. Seed Fleets if empty
    existing_fleets = db.query(Fleet).all()
    if not existing_fleets:
        print("[Seed] Seeding sample fleets...")
        fleets = [
            Fleet(name="Chandigarh Transport", organization="CTU - Chandigarh Administration", device_type="BUS"),
            Fleet(name="Delhi Transport", organization="DTC - Delhi Transport Corp", device_type="BUS"),
            Fleet(name="Metro Rail", organization="DMRC - Delhi Metro Rail", device_type="TRAIN"),
            Fleet(name="Private Fleet", organization="BlueLine Logistics", device_type="DIGITAL_SIGNAGE"),
        ]
        db.add_all(fleets)
        db.commit()

    ctu_fleet = db.query(Fleet).filter(Fleet.name == "Chandigarh Transport").first()
    dtc_fleet = db.query(Fleet).filter(Fleet.name == "Delhi Transport").first()
    dmrc_fleet = db.query(Fleet).filter(Fleet.name == "Metro Rail").first()
    pvt_fleet = db.query(Fleet).filter(Fleet.name == "Private Fleet").first()

    # 2. Seed / Update sample devices
    sample_devices = [
        {"device_id": "BUS-001", "name": "CTU Electric Bus #01", "device_type": "BUS", "fleet_id": ctu_fleet.id if ctu_fleet else None, "location": "Chandigarh Sector 17 Plaza", "lat": 30.7333, "lon": 76.7794, "status": "ONLINE", "token": "token_bus_001"},
        {"device_id": "BUS-002", "name": "CTU AC Express #02", "device_type": "BUS", "fleet_id": ctu_fleet.id if ctu_fleet else None, "location": "Chandigarh IT Park", "lat": 30.7240, "lon": 76.8450, "status": "ONLINE", "token": "token_bus_002"},
        {"device_id": "BUS-003", "name": "Delhi DTC Low-Floor #14", "device_type": "BUS", "fleet_id": dtc_fleet.id if dtc_fleet else None, "location": "Delhi Connaught Place", "lat": 28.6315, "lon": 77.2167, "status": "ONLINE", "token": "token_bus_003"},
        {"device_id": "TRAIN-001", "name": "Metro Express Yellow Line", "device_type": "TRAIN", "fleet_id": dmrc_fleet.id if dmrc_fleet else None, "location": "Delhi Rajiv Chowk Station", "lat": 28.6328, "lon": 77.2197, "status": "ONLINE", "token": "token_train_001"},
        {"device_id": "STATION-101", "name": "New Delhi Railway Display", "device_type": "STATION", "fleet_id": dtc_fleet.id if dtc_fleet else None, "location": "New Delhi Railway Concourse", "lat": 28.6430, "lon": 77.2200, "status": "ONLINE", "token": "token_stn_101"},
        {"device_id": "KIOSK-04", "name": "Airport T3 Interactive Kiosk", "device_type": "KIOSK", "fleet_id": pvt_fleet.id if pvt_fleet else None, "location": "Delhi IGI Airport Terminal 3", "lat": 28.5562, "lon": 77.1000, "status": "ONLINE", "token": "token_kiosk_04"},
        {"device_id": "LED-09", "name": "Marine Drive Billboard Screen", "device_type": "LED_SCREEN", "fleet_id": pvt_fleet.id if pvt_fleet else None, "location": "Mumbai Marine Drive Promenade", "lat": 18.9438, "lon": 72.8234, "status": "WARNING", "token": "token_led_09"},
    ]

    for sd in sample_devices:
        dev = db.query(Device).filter(Device.device_id == sd["device_id"]).first()
        if not dev:
            dev = Device(
                device_id=sd["device_id"],
                name=sd["name"],
                device_type=sd["device_type"],
                fleet_id=sd["fleet_id"],
                location_name=sd["location"],
                current_lat=sd["lat"],
                current_lon=sd["lon"],
                status=sd["status"],
                token=sd["token"],
                last_seen=datetime.utcnow()
            )
            db.add(dev)
        else:
            dev.device_type = sd["device_type"]
            dev.fleet_id = sd["fleet_id"]
            dev.location_name = sd["location"]
            dev.current_lat = sd["lat"]
            dev.current_lon = sd["lon"]
            dev.status = sd["status"]
            dev.last_seen = datetime.utcnow()

    # Also make sure existing DEV001 has fleet
    dev001 = db.query(Device).filter(Device.device_id == "DEV001").first()
    if dev001:
        dev001.device_type = "BUS"
        dev001.fleet_id = ctu_fleet.id if ctu_fleet else None
        dev001.location_name = "Chandigarh Sector 17"

    db.commit()
    db.close()
    print("[Migration] Completed successfully!")

if __name__ == "__main__":
    migrate_and_seed()

"""
GEOCAST Expanded Seed Script
============================
Creates:
  - 10 geographic zones (city-level, circle geometry)
  - 10 content campaigns (one per zone)
  - 8 fleets
  - 40 devices (15 bus, 8 train, 7 billboard, 5 station, 5 kiosk)

IDEMPOTENT: safe to run multiple times — detects existing records by
unique key and only upserts fields. No duplicates will be created.
"""
import sys
import os
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal, engine, Base
from app.models.zone import Zone
from app.models.content import Content
from app.models.fleet import Fleet
from app.models.device import Device
from app.models.log import Log
from app.services.geo_engine import create_circle_polygon_wkt
from app.services.assignment_engine import get_current_content


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------
def upsert(db, Model, lookup: dict, defaults: dict):
    """Get-or-create + update defaults. Returns (instance, created:bool)."""
    obj = db.query(Model).filter_by(**lookup).first()
    created = False
    if not obj:
        obj = Model(**lookup, **defaults)
        db.add(obj)
        created = True
    else:
        for k, v in defaults.items():
            setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj, created


# ---------------------------------------------------------------------------
# Seed
# ---------------------------------------------------------------------------
def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        print("🌱  GEOCAST — Expanded Database Seeding")
        print("=" * 60)

        # ── 1. CONTENT ──────────────────────────────────────────────
        content_specs = [
            # key                  title                              description                                       file_url                                                                                                      media_type  duration  tags
            ("default",           "GEOCAST Network Default Broadcast", "Default GEOCAST location-aware network display", "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80", "image", 10.0, "default,promo"),
            ("chandigarh",        "Chandigarh City Campaign",          "Explore the City Beautiful",                    "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=1200&q=80", "image", 15.0, "chandigarh,city"),
            ("ambala",            "Ambala Local Campaign",             "Ambala — Gateway of Haryana",                   "https://images.unsplash.com/photo-1543162188-34c9b52aab6e?auto=format&fit=crop&w=1200&q=80", "image", 15.0, "ambala,local"),
            ("delhi",             "Delhi Metro Campaign",              "Heart of the Nation — Delhi Metro & Heritage",  "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=1200&q=80", "image", 15.0, "delhi,metro"),
            ("agra",              "Agra Tourism Campaign",             "Taj Mahal & Mughal Heritage",                   "https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=1200&q=80", "image", 15.0, "agra,tourism,taj"),
            ("jaipur",            "Jaipur Tourism Campaign",           "Pink City — Rajasthan Tourism",                 "https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=1200&q=80", "image", 15.0, "jaipur,rajasthan,tourism"),
            ("lucknow",           "Lucknow City Campaign",             "City of Nawabs — Culture & Heritage",           "https://images.unsplash.com/photo-1582653291997-079a1c04e5a1?auto=format&fit=crop&w=1200&q=80", "image", 15.0, "lucknow,culture"),
            ("ahmedabad",         "Ahmedabad Business Campaign",       "Sabarmati Riverfront & Business Hub",           "https://images.unsplash.com/photo-1567449303078-57ad995bd329?auto=format&fit=crop&w=1200&q=80", "image", 15.0, "ahmedabad,business"),
            ("mumbai",            "Mumbai City Campaign",              "Gateway of India — Financial Capital",          "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=1200&q=80", "image", 15.0, "mumbai,finance"),
            ("pune",              "Pune Technology Campaign",          "Oxford of the East — Tech & Education",         "https://images.unsplash.com/photo-1605640840605-14ac1855827b?auto=format&fit=crop&w=1200&q=80", "image", 15.0, "pune,tech,education"),
            ("bengaluru",         "Bengaluru Technology Campaign",     "Silicon Valley of India",                       "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=1200&q=80", "image", 15.0, "bengaluru,tech,startup"),
        ]

        contents = {}
        for key, title, desc, url, mtype, dur, tags in content_specs:
            obj, created = upsert(db, Content,
                lookup={"title": title},
                defaults={"description": desc, "file_url": url, "media_type": mtype,
                          "duration": dur, "tags": tags})
            contents[key] = obj
            status = "created" if created else "updated"
            print(f"  {'📄'} Content [{status:7s}] {title}")

        print(f"✅ {len(contents)} content campaigns ready\n")

        # ── 2. FLEETS ───────────────────────────────────────────────
        fleet_specs = [
            ("North India Transit",    "North India Transit Authority",  "BUS"),
            ("Delhi NCR Transit",      "Delhi Urban Transit Authority",  "BUS"),
            ("Rajasthan Transit",      "Rajasthan State Road Transport", "BUS"),
            ("West India Transit",     "MSRTC & GSRTC Operations",       "BUS"),
            ("South India Transit",    "KSRTC & MSRTC South",            "BUS"),
            ("Static Billboard Net",   "OOH Media India Ltd",            "LED_SCREEN"),
            ("Station Display Net",    "Railway Station Media Corp",     "STATION"),
            ("Public Kiosk Network",   "Smart City Kiosk Authority",     "KIOSK"),
        ]

        fleets = {}
        for name, org, dtype in fleet_specs:
            obj, created = upsert(db, Fleet,
                lookup={"name": name},
                defaults={"organization": org, "device_type": dtype})
            fleets[name] = obj
            status = "created" if created else "updated"
            print(f"  🚌 Fleet [{status:7s}] {name}")

        print(f"✅ {len(fleets)} fleets ready\n")

        # ── 3. ZONES (10 city zones, circle geometry) ────────────────
        # (lat, lon, radius_m, color, content_key)
        zone_specs = [
            ("Chandigarh",  30.7333, 76.7794, 15000, "#3b82f6", "chandigarh"),
            ("Ambala",      30.3782, 76.7767, 15000, "#8b5cf6", "ambala"),
            ("Delhi",       28.6520, 77.2315, 25000, "#10b981", "delhi"),
            ("Agra",        27.1767, 78.0081, 20000, "#f59e0b", "agra"),
            ("Jaipur",      26.9124, 75.7873, 25000, "#ec4899", "jaipur"),
            ("Lucknow",     26.8467, 80.9462, 25000, "#06b6d4", "lucknow"),
            ("Ahmedabad",   23.0258, 72.5873, 25000, "#84cc16", "ahmedabad"),
            ("Mumbai",      19.0730, 72.8830, 30000, "#f97316", "mumbai"),
            ("Pune",        18.5204, 73.8567, 25000, "#14b8a6", "pune"),
            ("Bengaluru",   12.9716, 77.5946, 25000, "#a855f7", "bengaluru"),
        ]

        zones = {}
        for name, lat, lon, radius, color, content_key in zone_specs:
            geom = create_circle_polygon_wkt(lat, lon, float(radius))
            obj, created = upsert(db, Zone,
                lookup={"name": name},
                defaults={
                    "description": f"{name} city zone for geo-targeted content delivery",
                    "zone_type": "circle",
                    "center_lat": lat,
                    "center_lon": lon,
                    "radius_meters": float(radius),
                    "color": color,
                    "assigned_content_id": contents[content_key].id,
                    "geom": geom,
                })
            zones[name] = obj
            status = "created" if created else "updated"
            print(f"  📍 Zone [{status:7s}] {name:12s}  {lat:.4f}, {lon:.4f}  r={radius/1000:.0f}km")

        print(f"✅ {len(zones)} zones ready\n")

        # ── 4. DEVICES ──────────────────────────────────────────────
        # Shortcuts
        ni   = fleets["North India Transit"]
        ncr  = fleets["Delhi NCR Transit"]
        raj  = fleets["Rajasthan Transit"]
        west = fleets["West India Transit"]
        sth  = fleets["South India Transit"]
        bill = fleets["Static Billboard Net"]
        stn  = fleets["Station Display Net"]
        ksk  = fleets["Public Kiosk Network"]
        default_c = contents["default"]
        now = datetime.utcnow()

        devices_specs = [
            # BUSES — Moving devices (15)
            # id            name                              type  fleet  token                 lat        lon       loc                    status   refresh
            ("BUS-001", "Chandigarh Volvo Express 101",    "BUS",  ni,   "token_BUS001",  30.7333, 76.7794,  "Chandigarh ISBT",         "ONLINE", 5),
            ("BUS-002", "NH44 Intercity Express 202",      "BUS",  ni,   "token_BUS002",  30.3782, 76.7767,  "Ambala Bus Stand",         "ONLINE", 5),
            ("BUS-003", "Delhi Metro Feeder 303",          "BUS",  ncr,  "token_BUS003",  28.6520, 77.2315,  "Delhi Connaught Place",    "ONLINE", 5),
            ("BUS-004", "Rajdhani Road Express 404",       "BUS",  ncr,  "token_BUS004",  27.1767, 78.0081,  "Agra Fort Bus Stop",       "ONLINE", 5),
            ("BUS-005", "Jaipur Pink City Shuttle 505",   "BUS",  raj,  "token_BUS005",  26.9124, 75.7873,  "Jaipur Sindhi Camp",       "ONLINE", 5),
            ("BUS-006", "Rajasthan Roadways 606",         "BUS",  raj,  "token_BUS006",  23.0258, 72.5873,  "Ahmedabad GSRTC Depot",    "ONLINE", 5),
            ("BUS-007", "Mumbai BEST Route 707",          "BUS",  west, "token_BUS007",  19.0730, 72.8830,  "Mumbai CST",               "ONLINE", 5),
            ("BUS-008", "Pune-Mumbai Shivneri 808",       "BUS",  west, "token_BUS008",  18.5204, 73.8567,  "Pune Swargate Depot",      "ONLINE", 5),
            ("BUS-009", "UP Roadways Lucknow 909",        "BUS",  ncr,  "token_BUS009",  28.6520, 77.2315,  "Delhi Anand Vihar ISBT",   "ONLINE", 5),
            ("BUS-010", "Delhi-Lucknow Volvo 1010",       "BUS",  ncr,  "token_BUS010",  26.8467, 80.9462,  "Lucknow Charbagh",         "ONLINE", 5),
            ("BUS-011", "Chandigarh Metro Link 1111",     "BUS",  ni,   "token_BUS011",  30.7333, 76.7794,  "Chandigarh Rock Garden",   "ONLINE", 5),
            ("BUS-012", "Delhi Agra Highway Express 1212","BUS",  ncr,  "token_BUS012",  28.6520, 77.2315,  "Delhi Sarai Kale Khan",    "ONLINE", 5),
            ("BUS-013", "Jaipur-Ahmedabad State Bus 1313","BUS",  raj,  "token_BUS013",  26.9124, 75.7873,  "Jaipur Railway Station",   "ONLINE", 5),
            ("BUS-014", "Ahmedabad-Mumbai Volvo 1414",    "BUS",  west, "token_BUS014",  23.0258, 72.5873,  "Ahmedabad Paldi",          "ONLINE", 5),
            ("BUS-015", "Bengaluru-Pune KSRTC 1515",      "BUS",  sth,  "token_BUS015",  12.9716, 77.5946,  "Bengaluru Majestic",       "ONLINE", 5),

            # TRAINS — Moving devices (8)
            ("TRAIN-001", "Vande Bharat Chandigarh-Delhi", "TRAIN", ni,   "token_TRAIN001", 30.7333, 76.7794, "Chandigarh Railway Station", "ONLINE", 5),
            ("TRAIN-002", "Rajdhani Express Delhi-Agra",   "TRAIN", ncr,  "token_TRAIN002", 28.6520, 77.2315, "New Delhi Railway Station",  "ONLINE", 5),
            ("TRAIN-003", "Jaipur-Mumbai Express",         "TRAIN", raj,  "token_TRAIN003", 26.9124, 75.7873, "Jaipur Junction",            "ONLINE", 5),
            ("TRAIN-004", "Deccan Queen Mumbai-Pune",      "TRAIN", west, "token_TRAIN004", 19.0730, 72.8830, "Mumbai CSMT",                "ONLINE", 5),
            ("TRAIN-005", "Lucknow-Delhi Shatabdi",        "TRAIN", ncr,  "token_TRAIN005", 26.8467, 80.9462, "Lucknow Charbagh Station",   "ONLINE", 5),
            ("TRAIN-006", "Intercity Delhi-Jaipur",        "TRAIN", raj,  "token_TRAIN006", 28.6520, 77.2315, "Hazrat Nizamuddin Station",  "ONLINE", 5),
            ("TRAIN-007", "Ahmedabad-Pune Express",        "TRAIN", west, "token_TRAIN007", 23.0258, 72.5873, "Ahmedabad Junction",         "ONLINE", 5),
            ("TRAIN-008", "Bengaluru-Pune Superfast",      "TRAIN", sth,  "token_TRAIN008", 12.9716, 77.5946, "KSR Bengaluru City Station", "ONLINE", 5),

            # BILLBOARDS — Static devices (7)
            ("BILLBOARD-001", "Chandigarh Tribune Chowk LED",   "LED_SCREEN",      bill, "token_BB001", 30.7046, 76.7985, "Chandigarh - Tribune Chowk",    "ONLINE", 30),
            ("BILLBOARD-002", "Delhi Connaught Place Signage",  "DIGITAL_SIGNAGE", bill, "token_BB002", 28.6328, 77.2197, "Delhi - Connaught Place",       "ONLINE", 30),
            ("BILLBOARD-003", "Jaipur MI Road Hoarding",        "LED_SCREEN",      bill, "token_BB003", 26.9259, 75.7874, "Jaipur - MI Road",              "ONLINE", 30),
            ("BILLBOARD-004", "Ahmedabad SG Highway Billboard", "LED_SCREEN",      bill, "token_BB004", 23.0358, 72.5973, "Ahmedabad - SG Highway",        "ONLINE", 30),
            ("BILLBOARD-005", "Mumbai Bandra Worli Hoarding",   "DIGITAL_SIGNAGE", bill, "token_BB005", 19.0657, 72.8687, "Mumbai - Bandra Kurla Complex",  "ONLINE", 30),
            ("BILLBOARD-006", "Pune FC Road LED Screen",        "LED_SCREEN",      bill, "token_BB006", 18.5314, 73.8446, "Pune - FC Road",                "ONLINE", 30),
            ("BILLBOARD-007", "Bengaluru MG Road Signage",      "DIGITAL_SIGNAGE", bill, "token_BB007", 12.9756, 77.6027, "Bengaluru - MG Road",           "ONLINE", 30),

            # STATION DISPLAYS — Static (5)
            ("STATION-001", "Delhi ISBT Kashmiri Gate Display", "STATION", stn, "token_STN001", 28.6675, 77.2285, "Delhi - ISBT Kashmiri Gate",    "ONLINE", 20),
            ("STATION-002", "Chandigarh ISBT Sector 43",        "STATION", stn, "token_STN002", 30.7180, 76.7550, "Chandigarh - ISBT Sector 43",   "ONLINE", 20),
            ("STATION-003", "Mumbai CST Platform Display",       "STATION", stn, "token_STN003", 18.9402, 72.8358, "Mumbai - Chhatrapati Shivaji T","ONLINE", 20),
            ("STATION-004", "Bengaluru Majestic Bus Terminal",   "STATION", stn, "token_STN004", 12.9773, 77.5682, "Bengaluru - Kempegowda ISBT",   "ONLINE", 20),
            ("STATION-005", "Jaipur Sindhi Camp Bus Station",    "STATION", stn, "token_STN005", 26.9071, 75.7957, "Jaipur - Sindhi Camp",          "ONLINE", 20),

            # KIOSKS — Static (5)
            ("KIOSK-001", "Chandigarh Sector 17 Smart Kiosk", "KIOSK", ksk, "token_KSK001", 30.7381, 76.7800, "Chandigarh - Sector 17 Plaza", "ONLINE", 20),
            ("KIOSK-002", "Delhi CP Interactive Kiosk",        "KIOSK", ksk, "token_KSK002", 28.6315, 77.2167, "Delhi - Connaught Place",      "ONLINE", 20),
            ("KIOSK-003", "Jaipur Hawa Mahal Kiosk",           "KIOSK", ksk, "token_KSK003", 26.9239, 75.8267, "Jaipur - Hawa Mahal",          "ONLINE", 20),
            ("KIOSK-004", "Mumbai Gateway Kiosk",              "KIOSK", ksk, "token_KSK004", 18.9220, 72.8347, "Mumbai - Gateway of India",    "ONLINE", 20),
            ("KIOSK-005", "Bengaluru UB City Kiosk",           "KIOSK", ksk, "token_KSK005", 12.9719, 77.5937, "Bengaluru - UB City Mall",     "ONLINE", 20),
        ]

        created_count = 0
        updated_count = 0
        for row in devices_specs:
            dev_id, name, dtype, fleet, token, lat, lon, loc, status, refresh = row

            dev = db.query(Device).filter(Device.device_id == dev_id).first()
            if not dev:
                dev = Device(
                    device_id=dev_id, name=name, device_type=dtype,
                    fleet_id=fleet.id, token=token,
                    current_lat=lat, current_lon=lon, location_name=loc,
                    status=status, refresh_interval=refresh,
                    default_content_id=default_c.id, last_seen=now
                )
                db.add(dev)
                db.commit()
                db.refresh(dev)
                created_count += 1
            else:
                dev.name = name; dev.device_type = dtype; dev.fleet_id = fleet.id
                dev.token = token; dev.current_lat = lat; dev.current_lon = lon
                dev.location_name = loc; dev.status = status
                dev.refresh_interval = refresh; dev.default_content_id = default_c.id
                dev.last_seen = now
                db.commit()
                db.refresh(dev)
                updated_count += 1

            # Evaluate initial zone + content assignment
            decision = get_current_content(db, dev, location=(lat, lon))
            dev.current_zone_id = decision["zone_id"]
            dev.active_content_id = decision["content_id"]
            db.commit()

            # Log initial seeding event (only on first creation)
            existing_seed_log = db.query(Log).filter(
                Log.device_id == dev_id, Log.event_type == "DEVICE_SEEDED"
            ).first()
            if not existing_seed_log:
                db.add(Log(
                    device_id=dev_id, event_type="DEVICE_SEEDED",
                    message=f"Device {dev_id} ({name}) seeded in {decision.get('zone_name') or 'Transit'}",
                    timestamp=now
                ))
                db.commit()

        print(f"✅ Devices: {created_count} created, {updated_count} updated ({len(devices_specs)} total)\n")
        print("=" * 60)
        print("🎉  Seeding complete!")
        print(f"    Zones   : {len(zones)}")
        print(f"    Content : {len(contents)}")
        print(f"    Fleets  : {len(fleets)}")
        print(f"    Devices : {len(devices_specs)}")
        print("=" * 60)

    except Exception as e:
        db.rollback()
        print(f"❌ Error during seeding: {e}")
        import traceback; traceback.print_exc()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()

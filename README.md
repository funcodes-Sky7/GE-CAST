# GEOCAST: Location-Aware Remote Content Management System

> **Black Box Hackathon — Problem Statement 2**  
> Centralized IoT and digital signage management platform delivering dynamic multimedia content based on real-time geographical boundaries (geofencing), time-based schedules, and device rules.

---

## 🌟 Architecture & Core Loop

```
  ┌────────────────────────────────────────────────────────┐
  │                 ADMIN WEB DASHBOARD                    │
  │                  (React + TypeScript)                  │
  └──────────────────────────┬─────────────────────────────┘
                             │ REST API & WebSockets
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │                    FASTAPI BACKEND                     │
  │  ┌───────────────┐ ┌───────────────┐ ┌──────────────┐  │
  │  │  Auth Service │ │ Device Service│ │Content Engine│  │
  │  └───────────────┘ └───────┬───────┘ └──────────────┘  │
  │                            │                           │
  │                            ▼                           │
  │         ┌─────────────────────────────────────┐        │
  │         │   POSTGIS / SPATIAL GEO ENGINE      │        │
  │         │  (ST_Contains, Point-in-Polygon)    │        │
  │         └──────────────────┬──────────────────┘        │
  │                            │                           │
  │                            ▼                           │
  │         ┌─────────────────────────────────────┐        │
  │         │      ASSIGNMENT DECISION PIPELINE   │        │
  │         │   Zone Sched > Zone Media > Default │        │
  │         └──────────────────┬──────────────────┘        │
  │                            │                           │
  │                            ▼                           │
  │         ┌─────────────────────────────────────┐        │
  │         │    WEBSOCKET REAL-TIME DISPATCH     │        │
  │         │       (Push CONTENT_UPDATED)        │        │
  │         └──────────────────┬──────────────────┘        │
  └────────────────────────────┼───────────────────────────┘
                               │
                               ▼
  ┌────────────────────────────────────────────────────────┐
  │           DISPLAY DEVICE CLIENT / SIMULATOR            │
  │   - GPS Telemetry & Heartbeat                          │
  │   - Local Offline Cache (Resilience on dropouts)       │
  │   - Instant Content Transition Display                 │
  └────────────────────────────────────────────────────────┘
```

---

## 📂 Project Structure

```
trace_Hackthone/
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI application & lifespan
│   │   ├── core/
│   │   │   ├── config.py               # Settings, DB URL, JWT secrets
│   │   │   └── security.py             # Admin JWT & Device token auth
│   │   ├── db/
│   │   │   ├── session.py              # Engine & SessionLocal
│   │   │   └── base.py                 # Base metadata registry
│   │   ├── models/                     # SQLAlchemy models
│   │   │   ├── user.py                 # Admin users
│   │   │   ├── device.py               # Display devices & status
│   │   │   ├── content.py              # Media items (images/videos)
│   │   │   ├── zone.py                 # PostGIS geofences (circular & polygonal)
│   │   │   ├── schedule.py             # Time-based scheduling rules
│   │   │   └── log.py                  # Audit & transition event history
│   │   ├── schemas/                    # Pydantic validation models
│   │   │   ├── auth.py
│   │   │   ├── device.py
│   │   │   ├── content.py
│   │   │   ├── zone.py
│   │   │   ├── schedule.py
│   │   │   └── dashboard.py
│   │   ├── services/                   # Business logic
│   │   │   ├── geo_engine.py           # PostGIS ST_Contains & spatial detection
│   │   │   ├── assignment_engine.py    # Priority decision pipeline
│   │   │   ├── content_service.py      # Storage & file management
│   │   │   ├── device_service.py       # Telemetry, heartbeats, status
│   │   │   ├── schedule_service.py     # Time-window queries
│   │   │   ├── websocket_manager.py    # Real-time WebSocket connection manager
│   │   │   └── heartbeat_monitor.py    # Offline timeout background worker
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── auth.py             # Admin login / JWT
│   │   │   │   ├── devices.py          # Device CRUD & settings
│   │   │   │   ├── content.py          # Upload and manage media
│   │   │   │   ├── zones.py            # PostGIS zone creation & assignment
│   │   │   │   ├── schedules.py        # Scheduling rules
│   │   │   │   ├── dashboard.py        # Overview statistics & audit logs
│   │   │   │   └── device_api.py       # Device edge endpoints (Device Auth)
│   │   │   └── websockets.py           # Device & Dashboard WebSockets
│   │   └── static/
│   │       ├── uploads/                # Media storage directory
│   │       └── player/                 # Edge display screen web player
│   ├── alembic/                        # Migration scripts
│   ├── alembic.ini
│   ├── requirements.txt
│   ├── .env.example
│   └── seed_data.py                    # Prepopulates Chandigarh, Delhi & Mumbai demo data
│
├── simulator/
│   └── device_simulator.py             # Simulates moving vehicles across cities
│
├── frontend/                           # Reserved for teammate's React + TS dashboard
└── README.md
```

---

## ⚡ Quick Start

### 1. Prerequisites
- Python 3.9+ installed
- Virtual environment setup

### 2. Setup & Install Dependencies
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Seed Demo Data
Pre-populates admin credentials, Chandigarh, Delhi, and Mumbai geographical zones, demo media banners, and devices:
```bash
python seed_data.py
```
*Default Admin Credentials:*
- Email: `admin@geocast.io`
- Password: `admin123`

### 4. Start Backend Server
```bash
uvicorn app.main.app --reload --port 8000
```
- **API Documentation (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Virtual Display Player**: [http://localhost:8000/player](http://localhost:8000/player)
- **Dashboard Overview API**: [http://localhost:8000/api/v1/dashboard/overview](http://localhost:8000/api/v1/dashboard/overview)

---

## 🎬 Live Demonstration Guide

### Step 1: Open Virtual Display Player
Open your browser to:
[http://localhost:8000/player?device_id=DEV001&token=dev_chandigarh_demo_key](http://localhost:8000/player?device_id=DEV001&token=dev_chandigarh_demo_key)

The player will pair with `DEV001`, connect via WebSocket, and display current active content with live HUD telemetry.

### Step 2: Run the Vehicle Simulator
In another terminal, run the vehicle route simulator:
```bash
cd simulator
python3 device_simulator.py --device-id DEV001 --token dev_chandigarh_demo_key --delay 4
```

### Step 3: Watch Real-Time Location-Based Switching!
Watch both the terminal and the display screen player:
1. **Chandigarh Zone**: Device enters Chandigarh $\to$ PostGIS detects zone $\to$ Screen transitions to **"WELCOME TO CHANDIGARH"**.
2. **Highway NH44 (Transit)**: Device exits Chandigarh $\to$ Outside geofences $\to$ Screen switches to **"GEOCAST CONNECTED NETWORK"** (Fallback).
3. **Delhi NCR Zone**: Device enters Delhi $\to$ PostGIS detects Delhi NCR $\to$ Screen transitions to **"EXPLORE CAPITAL DELHI"**.
4. **Mumbai Zone**: Device enters Mumbai $\to$ Screen transitions to **"MUMBAI COASTAL DRIVE"**.

---

## 🛰️ PostGIS & Spatial Geofencing
- Supports both **Circular Geofences** (`center_lat`, `center_lon`, `radius_meters`) and **Polygonal Geofences** (`coordinates_json`).
- When connected to PostgreSQL + PostGIS, executes native spatial queries:
  ```sql
  SELECT id FROM zones 
  WHERE geom IS NOT NULL 
  AND ST_Contains(geom, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326));
  ```
- Built with an automatic in-memory / Shapely fallback so local hackathon testing works immediately on any machine!

---

## 🛡️ Authentication Architecture
- **Admin Users**: Secured via JWT (`Authorization: Bearer <token>`).
- **Display Devices**: Authenticate via lightweight API tokens (`X-Device-Token` header or `?token=` parameter). Devices are isolated from admin operations.

---

## 💾 Offline Resilience
- If a display screen temporarily loses network connection, it continuously plays its locally cached media.
- Once connectivity is restored, it re-synchronizes with the server and downloads updated content if the location or schedule changed while offline.

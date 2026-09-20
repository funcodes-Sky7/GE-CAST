import asyncio
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.core.config import settings
from app.db.session import engine, Base
# Import all models to ensure metadata registration
import app.db.base

from app.api.v1 import auth, devices, content, zones, schedules, dashboard, device_api, fleets
from app.api import websockets
from app.services.heartbeat_monitor import monitor_device_heartbeats

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Ensure database tables are created
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"[Startup Warning] Could not auto-create tables: {e}")
    
    # 2. Start background heartbeat monitor
    monitor_task = asyncio.create_task(monitor_device_heartbeats(check_interval=10))
    
    yield
    
    # Shutdown
    monitor_task.cancel()
    try:
        await monitor_task
    except asyncio.CancelledError:
        pass

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="GEOCAST - Location-Aware Remote Content Management System Backend API",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static Files
static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
uploads_dir = os.path.join(static_dir, "uploads")
player_dir = os.path.join(static_dir, "player")

os.makedirs(uploads_dir, exist_ok=True)
os.makedirs(player_dir, exist_ok=True)

app.mount("/static/uploads", StaticFiles(directory=uploads_dir), name="uploads")
app.mount("/static/player", StaticFiles(directory=player_dir), name="player_static")

# Mount Routers under /api/v1
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(devices.router, prefix=settings.API_V1_STR)
app.include_router(fleets.router, prefix=settings.API_V1_STR)
app.include_router(content.router, prefix=settings.API_V1_STR)
app.include_router(zones.router, prefix=settings.API_V1_STR)
app.include_router(schedules.router, prefix=settings.API_V1_STR)
app.include_router(dashboard.router, prefix=settings.API_V1_STR)
app.include_router(device_api.router, prefix=settings.API_V1_STR)

# Top-level aliases requested in problem statement
# e.g., /api/dashboard/overview, /api/devices, /api/device, /api/fleets
app.include_router(dashboard.router, prefix="/api")
app.include_router(devices.router, prefix="/api")
app.include_router(fleets.router, prefix="/api")
app.include_router(device_api.router, prefix="/api")

# WebSockets
app.include_router(websockets.router)

# Health & Root Check
@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "GEOCAST Backend", "version": "1.0.0"}

# Display Player Web App Route
@app.get("/player", tags=["Player"])
@app.get("/player/{device_id}", tags=["Player"])
def serve_player(device_id: str = None):
    """Serves the interactive edge display screen player"""
    player_html = os.path.join(player_dir, "index.html")
    return FileResponse(player_html)

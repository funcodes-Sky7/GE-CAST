import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.device import Device
from app.services.device_service import process_device_telemetry
from app.services.websocket_manager import ws_manager

router = APIRouter(tags=["WebSockets"])

@router.websocket("/ws/device/{device_id}")
async def device_websocket_endpoint(
    websocket: WebSocket,
    device_id: str,
    token: str = Query(...)
):
    """
    Real-time bidirectional WebSocket channel for display devices.
    Requires device-specific token for authentication.
    - Device streams GPS/telemetry or heartbeat pings
    - Server pushes real-time CONTENT_UPDATED and CONFIG_UPDATED events
    """
    # Initial authentication and registration
    db = SessionLocal()
    try:
        device = db.query(Device).filter(Device.device_id == device_id, Device.token == token).first()
        if not device:
            await websocket.close(code=4001, reason="Invalid device token")
            return

        await ws_manager.connect_device(device_id, websocket)
        
        # Send initial connection confirmation & current active content
        decision = await process_device_telemetry(db, device)
        await websocket.send_text(json.dumps({
            "event": "CONNECTED",
            "device_id": device_id,
            "current_content": decision
        }))
    finally:
        db.close()

    try:
        while True:
            data_text = await websocket.receive_text()
            try:
                msg = json.loads(data_text)
                msg_type = msg.get("type", msg.get("event"))
                
                if msg_type in ["LOCATION_UPDATE", "HEARTBEAT"]:
                    lat = msg.get("latitude", msg.get("lat"))
                    lon = msg.get("longitude", msg.get("lon"))
                    
                    db = SessionLocal()
                    try:
                        dev = db.query(Device).filter(Device.device_id == device_id).first()
                        if dev:
                            await process_device_telemetry(db, dev, lat, lon)
                    finally:
                        db.close()
                    
                elif msg_type == "PING":
                    await websocket.send_text(json.dumps({"event": "PONG"}))
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        ws_manager.disconnect_device(device_id, websocket)

@router.websocket("/ws/dashboard")
async def dashboard_websocket_endpoint(websocket: WebSocket):
    """
    Real-time WebSocket feed for React dashboard.
    Streams live map location updates, online/offline status changes, and content playback events.
    """
    await ws_manager.connect_dashboard(websocket)
    try:
        # Keep connection open listening for any dashboard client events or pings
        while True:
            text = await websocket.receive_text()
            if text == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect_dashboard(websocket)

import json
from typing import Dict, Set, Any
from fastapi import WebSocket

class WebSocketManager:
    def __init__(self):
        # Connected display devices: device_id -> set of WebSockets
        self.device_connections: Dict[str, Set[WebSocket]] = {}
        # Connected admin dashboards
        self.dashboard_connections: Set[WebSocket] = set()

    async def connect_device(self, device_id: str, websocket: WebSocket):
        await websocket.accept()
        if device_id not in self.device_connections:
            self.device_connections[device_id] = set()
        self.device_connections[device_id].add(websocket)

    def disconnect_device(self, device_id: str, websocket: WebSocket):
        if device_id in self.device_connections:
            self.device_connections[device_id].discard(websocket)
            if not self.device_connections[device_id]:
                del self.device_connections[device_id]

    async def connect_dashboard(self, websocket: WebSocket):
        await websocket.accept()
        self.dashboard_connections.add(websocket)

    def disconnect_dashboard(self, websocket: WebSocket):
        self.dashboard_connections.discard(websocket)

    async def send_to_device(self, device_id: str, message: Dict[str, Any]):
        """Send message specifically to a display device (e.g. CONTENT_UPDATED)"""
        if device_id in self.device_connections:
            data = json.dumps(message)
            dead_sockets = set()
            for ws in self.device_connections[device_id]:
                try:
                    await ws.send_text(data)
                except Exception:
                    dead_sockets.add(ws)
            for ws in dead_sockets:
                self.device_connections[device_id].discard(ws)

    async def broadcast_to_dashboard(self, message: Dict[str, Any]):
        """Broadcast live telemetry / status updates to all open dashboard screens"""
        data = json.dumps(message)
        dead_sockets = set()
        for ws in self.dashboard_connections:
            try:
                await ws.send_text(data)
            except Exception:
                dead_sockets.add(ws)
        for ws in dead_sockets:
            self.dashboard_connections.discard(ws)

ws_manager = WebSocketManager()

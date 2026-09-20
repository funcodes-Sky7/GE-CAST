import asyncio
from datetime import datetime, timedelta
from app.db.session import SessionLocal
from app.models.device import Device
from app.models.log import Log
from app.core.config import settings
from app.services.websocket_manager import ws_manager

async def monitor_device_heartbeats(check_interval: int = 10):
    """
    Background worker that runs periodically:
    Checks if devices have not reported within DEVICE_OFFLINE_THRESHOLD_SECONDS.
    If so, transitions status from ONLINE -> OFFLINE, writes audit log, and notifies dashboard.
    """
    while True:
        try:
            await asyncio.sleep(check_interval)
            db = SessionLocal()
            try:
                now = datetime.utcnow()
                cutoff = now - timedelta(seconds=settings.DEVICE_OFFLINE_THRESHOLD_SECONDS)
                
                # Find devices marked ONLINE whose last_seen is older than cutoff
                timed_out_devices = db.query(Device).filter(
                    Device.status == "ONLINE",
                    (Device.last_seen < cutoff) | (Device.last_seen.is_(None))
                ).all()

                for dev in timed_out_devices:
                    dev.status = "OFFLINE"
                    log_entry = Log(
                        device_id=dev.device_id,
                        event_type="DEVICE_OFFLINE",
                        message=f"Device {dev.device_id} timed out and is now OFFLINE",
                        timestamp=now
                    )
                    db.add(log_entry)
                    db.commit()

                    # Notify dashboard via WebSocket
                    await ws_manager.broadcast_to_dashboard({
                        "event": "DEVICE_STATUS_CHANGED",
                        "device_id": dev.device_id,
                        "status": "OFFLINE",
                        "last_seen": dev.last_seen.isoformat() if dev.last_seen else None
                    })
            finally:
                db.close()
        except asyncio.CancelledError:
            break
        except Exception as e:
            # Prevent background loop from crashing
            await asyncio.sleep(5)

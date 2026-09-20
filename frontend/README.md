# GEOCAST Frontend Integration Guide (For Teammate)

Welcome! This folder is reserved for your **React + TypeScript** web application.

The FastAPI backend is fully operational with CORS enabled (`*`), JWT authentication, PostGIS location processing, and real-time WebSockets.

---

## 🚀 Connecting to the Backend

- **Base URL**: `http://127.0.0.1:8000`
- **Swagger / OpenAPI Documentation**: `http://127.0.0.1:8000/docs`
- **Interactive Player Preview**: `http://127.0.0.1:8000/player`

---

## 🔑 Authentication (Admin)

1. **Login**:
   `POST /api/v1/auth/login`
   ```json
   {
     "email": "admin@geocast.io",
     "password": "admin123"
   }
   ```
   **Response**:
   ```json
   {
     "access_token": "eyJhbGciOi...",
     "token_type": "bearer",
     "user": { "id": 1, "email": "admin@geocast.io", "full_name": "System Administrator" }
   }
   ```
2. **Authorization Header**:
   Send on protected admin endpoints:
   `Authorization: Bearer <access_token>`

---

## 📊 Core API Endpoints

### 1. Dashboard Overview Stats (Matches wireframe cards!)
- `GET /api/v1/dashboard/overview` (or `GET /api/dashboard/overview`)
- **Response**:
  ```json
  {
    "total_devices": 24,
    "online_devices": 21,
    "offline_devices": 3,
    "total_zones": 18,
    "total_contents": 4,
    "active_schedules": 1
  }
  ```

### 2. Live Device Map Markers
- `GET /api/v1/devices/locations` (or `GET /api/devices/locations`)
- **Response**:
  ```json
  [
    {
      "device_id": "DEV001",
      "name": "Fleet Vehicle Screen #01",
      "latitude": 30.7333,
      "longitude": 76.7794,
      "status": "ONLINE",
      "current_zone": "Chandigarh Zone",
      "current_content_title": "Chandigarh Special Campaign",
      "current_content_url": "/static/uploads/chandigarh_city.svg",
      "last_seen": "2026-09-20T12:00:00Z"
    }
  ]
  ```

### 3. Device Management
- `GET /api/v1/devices` - List all devices
- `POST /api/v1/devices` - Register new device (`{ "device_id": "DEV004", "name": "..." }`)
- `PUT /api/v1/devices/{device_id}` - Update settings (override content, fallback, interval)
- `DELETE /api/v1/devices/{device_id}` - Delete device

### 4. Content Management
- `GET /api/v1/content` - List all images/videos
- `POST /api/v1/content/upload` - Multipart form upload (`title`, `description`, `duration`, `file`)
- `DELETE /api/v1/content/{content_id}` - Delete media

### 5. Zones Management
- `GET /api/v1/zones` - List zones (center_lat, center_lon, radius_meters, coordinates_json, assigned_content)
- `POST /api/v1/zones` - Create new zone:
  ```json
  {
    "name": "Delhi NCR Zone",
    "zone_type": "circle",
    "center_lat": 28.6139,
    "center_lon": 77.2090,
    "radius_meters": 35000,
    "assigned_content_id": 2,
    "color": "#ef4444"
  }
  ```

### 6. Scheduling
- `GET /api/v1/schedules` - List active time schedules
- `POST /api/v1/schedules` - Create schedule (`zone_id`, `content_id`, `start_time`, `end_time`, `priority`)

---

## ⚡ Real-Time WebSocket for React Dashboard

Connect from React:
```ts
const ws = new WebSocket("ws://127.0.0.1:8000/ws/dashboard");

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("Live Event:", data);
  // Events:
  // - "DEVICE_TELEMETRY": GPS coordinate changes & active content updates
  // - "DEVICE_STATUS_CHANGED": ONLINE / OFFLINE timeout changes
};
```

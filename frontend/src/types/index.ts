// ─── Auth ───────────────────────────────────────────────────────────────────
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: {
    id: number;
    email: string;
    full_name: string;
  };
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
export interface DashboardOverview {
  total_devices: number;
  online_devices: number;
  offline_devices: number;
  total_zones: number;
  total_contents: number;
  active_schedules: number;
}

export interface AuditLog {
  id: number;
  device_id: string;
  event_type: string;
  message: string;
  metadata?: string;
  timestamp: string;
}

// ─── Device types (re-exported from device.ts; includes DeviceStatus, DeviceListItem,
//     DeviceCreateInput, DeviceLocationMarker, Device alias, DeviceCreate alias, etc.)
export * from './device';

// ─── Content ─────────────────────────────────────────────────────────────────
export interface Content {
  id: number;
  title: string;
  description?: string;
  file_url: string;
  media_type: string;
  file_size?: number;
  duration: number;
  tags?: string;
  zone_ids?: string;
  priority?: number;
  is_active?: boolean;
  is_default?: boolean;
  campaign_id?: number;
  created_at: string;
}

// ─── Zone ────────────────────────────────────────────────────────────────────
export type ZoneType = 'circle' | 'polygon';

export interface Zone {
  id: number;
  name: string;
  description?: string;
  zone_type: ZoneType;
  center_lat?: number;
  center_lon?: number;
  radius_meters?: number;
  coordinates_json?: string;
  assigned_content_id?: number;
  color: string;
  created_at: string;
}

export interface ZoneCreate {
  name: string;
  description?: string;
  zone_type: ZoneType;
  center_lat?: number;
  center_lon?: number;
  radius_meters?: number;
  coordinates_json?: string;
  assigned_content_id?: number;
  color?: string;
}

// ─── Schedule ────────────────────────────────────────────────────────────────
export interface Schedule {
  id: number;
  name?: string;
  zone_id: number;
  content_id: number;
  start_time: string;
  end_time: string;
  priority: number;
  is_active: boolean;
}

export interface ScheduleCreate {
  name?: string;
  zone_id: number;
  content_id: number;
  start_time: string;
  end_time: string;
  priority?: number;
}

export interface ZoneStat {
  zone_id: number;
  name: string;
  color: string;
  device_count: number;
  online_count?: number;
}

// ─── WebSocket Events ─────────────────────────────────────────────────────────
// DeviceStatus is imported transitively from './device' above.
export interface WsDeviceTelemetry {
  event: 'DEVICE_TELEMETRY';
  type?: string;
  device_id: string;
  name?: string;
  device_type?: string;
  fleet_name?: string;
  latitude: number;
  longitude: number;
  location_name?: string;
  status: import('./device').DeviceStatus;
  current_zone?: string;
  zone_name?: string;
  active_content_title?: string;
  active_content_url?: string;
  playlist?: import('./device').PlaylistItem[];
  slot_duration?: number;
  reason?: string;
  last_seen?: string;
}

export interface WsDeviceStatusChanged {
  event: 'DEVICE_STATUS_CHANGED';
  device_id: string;
  status: import('./device').DeviceStatus;
}

export interface WsGenericEvent {
  event: string;
  type?: string;
  device_id?: string;
  message?: string;
  zone_name?: string;
  reason?: string;
  timestamp?: string;
  [key: string]: any;
}

export type WsEvent = WsDeviceTelemetry | WsDeviceStatusChanged | WsGenericEvent;


export type DeviceType =
  | 'BUS'
  | 'TRAIN'
  | 'STATION'
  | 'DIGITAL_SIGNAGE'
  | 'KIOSK'
  | 'LED_SCREEN';

export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'WARNING';

export interface Fleet {
  id: number;
  name: string;
  organization?: string;
  device_type: string;
  created_at: string;
  device_count?: number;
}

export interface DeviceContent {
  id: number;
  title: string;
  description?: string;
  file_url: string;
  media_type?: string;
  duration?: number;
}


export interface DeviceListItem {
  id: number;
  device_id: string;
  name: string;
  device_type: DeviceType;
  fleet_id?: number;
  fleet?: Fleet;
  location_name?: string;
  current_lat?: number;
  current_lon?: number;
  current_zone_id?: number;
  current_zone?: {
    id: number;
    name: string;
    zone_type: string;
    color?: string;
  };
  active_content?: DeviceContent;
  status: DeviceStatus;
  last_seen?: string;
  created_at: string;
  refresh_interval: number;
  token: string;
}

export interface DeviceStats {
  total_devices: number;
  online_devices: number;
  offline_devices: number;
  warning_devices: number;
  active_zones: number;
}

export interface DevicePaginatedResponse {
  items: DeviceListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  stats: DeviceStats;
}

export interface DeviceLogItem {
  id: number;
  timestamp: string;
  event_type: string;
  message?: string;
  details_json?: string;
}

export interface PlaylistItem {
  campaign_id?: number | null;
  content_id?: number | null;
  title: string;
  file_url?: string | null;
  media_type?: string;
  duration?: number;
  priority?: number;
  description?: string | null;
}

export interface DeviceDetail extends DeviceListItem {
  assignment_reason?: string;
  assigned_by?: string;
  recent_logs: DeviceLogItem[];
  override_content_id?: number;
  default_content_id?: number;
  playlist?: PlaylistItem[];
  slot_duration?: number;
}

export interface DeviceQueryParams {
  page?: number;
  page_size?: number;
  search?: string;
  device_type?: string;
  fleet_id?: number;
  zone_id?: number;
  status?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface DeviceCreateInput {
  device_id: string;
  name: string;
  device_type: DeviceType;
  fleet_id?: number;
  initial_zone_id?: number;
  token?: string;
  refresh_interval?: number;
}

// ─── Location Marker (for live map) ─────────────────────────────────────────
export interface DeviceLocationMarker {
  device_id: string;
  name: string;
  device_type?: string;
  fleet_name?: string;
  latitude?: number | null;
  longitude?: number | null;
  location_name?: string;
  status: DeviceStatus;
  current_zone?: string | null;
  current_content_title?: string | null;
  current_content_url?: string | null;
  playlist?: PlaylistItem[];
  slot_duration?: number;
  last_seen?: string | null;
}

// ─── Legacy aliases (for backward compatibility) ──────────────────────────────
export type Device = DeviceListItem;
export type DeviceCreate = DeviceCreateInput;
export interface DeviceUpdate {
  name?: string;
  description?: string;
  override_content_id?: number;
  fallback_content_id?: number;
  refresh_interval?: number;
}

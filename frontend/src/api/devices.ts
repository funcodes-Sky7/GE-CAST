import client from './client';
import type {
  DeviceListItem,
  DeviceDetail,
  DevicePaginatedResponse,
  DeviceQueryParams,
  DeviceLocationMarker,
  DeviceCreateInput,
  DeviceLogItem,
  Fleet,
} from '../types';

export const devicesApi = {
  // Paginated device list with search, sorting, and filters
  listPaginated: async (params: DeviceQueryParams = {}): Promise<DevicePaginatedResponse> => {
    const res = await client.get<DevicePaginatedResponse>('/devices', { params });
    return res.data;
  },

  // Fallback simple list
  list: async (): Promise<DeviceListItem[]> => {
    const res = await client.get<DevicePaginatedResponse>('/devices', { params: { page_size: 100 } });
    return res.data.items ?? (res.data as any);
  },

  // Detail inspection with reason and recent activity logs
  get: async (deviceId: string): Promise<DeviceDetail> => {
    const res = await client.get<DeviceDetail>(`/devices/${deviceId}`);
    return res.data;
  },

  // Create/register device
  create: async (data: DeviceCreateInput): Promise<DeviceListItem> => {
    const res = await client.post<DeviceListItem>('/devices', data);
    return res.data;
  },

  // Update device settings
  update: async (deviceId: string, data: Partial<DeviceListItem>): Promise<DeviceListItem> => {
    const res = await client.put<DeviceListItem>(`/devices/${deviceId}`, data);
    return res.data;
  },

  // Delete device
  delete: async (deviceId: string): Promise<void> => {
    await client.delete(`/devices/${deviceId}`);
  },

  // Live location markers for map
  locations: async (): Promise<DeviceLocationMarker[]> => {
    const res = await client.get<DeviceLocationMarker[]>('/devices/locations');
    return res.data;
  },

  // Fetch device activity logs
  getLogs: async (deviceId: string, limit = 50): Promise<DeviceLogItem[]> => {
    const res = await client.get<DeviceLogItem[]>(`/devices/${deviceId}/logs`, { params: { limit } });
    return res.data;
  },

  // Execute remote command
  executeAction: async (deviceId: string, action: string, params?: any): Promise<any> => {
    const res = await client.post(`/devices/${deviceId}/action`, { action, params });
    return res.data;
  },

  // Fleets API
  getFleets: async (): Promise<Fleet[]> => {
    const res = await client.get<Fleet[]>('/fleets');
    return res.data;
  },

  createFleet: async (data: { name: string; organization?: string; device_type?: string }): Promise<Fleet> => {
    const res = await client.post<Fleet>('/fleets', data);
    return res.data;
  },

  // Fetch fresh playlist from the assignment engine for a specific device
  getPlaylist: async (deviceId: string): Promise<{ playlist: any[]; zone_name: string | null; reason: string; slot_duration: number }> => {
    const res = await client.get(`/devices/${deviceId}/playlist`);
    return res.data;
  },
};

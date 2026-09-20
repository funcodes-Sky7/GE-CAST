import apiClient from './client';
import type { Zone, ZoneCreate } from '../types';

export const zonesApi = {
  list: async (): Promise<Zone[]> => {
    const res = await apiClient.get<Zone[]>('/zones');
    return res.data;
  },

  create: async (data: ZoneCreate): Promise<Zone> => {
    const res = await apiClient.post<Zone>('/zones', data);
    return res.data;
  },

  update: async (zoneId: number, data: Partial<ZoneCreate>): Promise<Zone> => {
    const res = await apiClient.put<Zone>(`/zones/${zoneId}`, data);
    return res.data;
  },

  delete: async (zoneId: number): Promise<void> => {
    await apiClient.delete(`/zones/${zoneId}`);
  },
};

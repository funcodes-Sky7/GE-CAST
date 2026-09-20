import apiClient from './client';
import type { DashboardOverview, AuditLog, ZoneStat } from '../types';

export const dashboardApi = {
  getOverview: async (): Promise<DashboardOverview> => {
    const res = await apiClient.get<DashboardOverview>('/dashboard/overview');
    return res.data;
  },

  getZoneStats: async (): Promise<ZoneStat[]> => {
    const res = await apiClient.get<ZoneStat[]>('/dashboard/zone-stats');
    return res.data;
  },

  getLogs: async (limit = 50): Promise<AuditLog[]> => {
    const res = await apiClient.get<AuditLog[]>(`/dashboard/logs?limit=${limit}`);
    return res.data;
  },
};


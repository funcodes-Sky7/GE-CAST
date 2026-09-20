import apiClient from './client';
import type { Schedule, ScheduleCreate } from '../types';

export const schedulesApi = {
  list: async (): Promise<Schedule[]> => {
    const res = await apiClient.get<Schedule[]>('/schedules');
    return res.data;
  },

  create: async (data: ScheduleCreate): Promise<Schedule> => {
    const res = await apiClient.post<Schedule>('/schedules', data);
    return res.data;
  },

  delete: async (scheduleId: number): Promise<void> => {
    await apiClient.delete(`/schedules/${scheduleId}`);
  },
};

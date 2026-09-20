import apiClient from './client';
import type { LoginRequest, LoginResponse } from '../types';

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const res = await apiClient.post<LoginResponse>('/auth/login', data);
    return res.data;
  },

  me: async () => {
    const res = await apiClient.get('/auth/me');
    return res.data;
  },
};

import axios from 'axios';
import type { AdvertiserUser } from '../store/advertiserAuthStore';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api/v1';

// Separate axios instance for advertiser — uses its own localStorage token
const advClient = axios.create({ baseURL: API_BASE });

advClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('geocast_adv_token') || localStorage.getItem('geocast_token');
  if (token) {
    if (config.headers && typeof config.headers.set === 'function') {
      config.headers.set('Authorization', `Bearer ${token}`);
    } else if (config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AdvertiserLoginResponse {
  access_token: string;
  token_type: string;
  user: AdvertiserUser;
}

export interface AdvertiserRegisterRequest {
  full_name: string;
  company_name: string;
  email: string;
  phone?: string;
  password: string;
  confirm_password: string;
}

export interface Campaign {
  id: number;
  owner_user_id: number;
  name: string;
  description?: string;
  media_url?: string;
  zone_ids?: string;
  device_types?: string;
  start_date?: string;
  end_date?: string;
  status: string;
  created_at: string;
}

export interface DashboardStats {
  total_campaigns: number;
  active_campaigns: number;
  scheduled_campaigns: number;
  completed_campaigns: number;
  paused_campaigns: number;
}

// ─── Auth API ────────────────────────────────────────────────────────────────

export const advertiserAuthApi = {
  register: async (data: AdvertiserRegisterRequest): Promise<AdvertiserUser> => {
    const res = await advClient.post<AdvertiserUser>('/auth/advertiser/register', data);
    return res.data;
  },

  login: async (email: string, password: string): Promise<AdvertiserLoginResponse> => {
    const res = await advClient.post<AdvertiserLoginResponse>('/auth/advertiser/login', {
      email,
      password,
    });
    return res.data;
  },

  sendVerificationCode: async (email: string): Promise<{ message: string; dev_code: string }> => {
    const res = await advClient.post<{ message: string; dev_code: string }>('/auth/advertiser/send-verification-code', { email });
    return res.data;
  },

  verifyCode: async (email: string, code: string): Promise<{ message: string; verified: boolean }> => {
    const res = await advClient.post<{ message: string; verified: boolean }>('/auth/advertiser/verify-code', { email, code });
    return res.data;
  },

  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const res = await advClient.post<{ message: string }>('/auth/forgot-password', { email });
    return res.data;
  },

  me: async (): Promise<AdvertiserUser> => {
    const res = await advClient.get<AdvertiserUser>('/auth/advertiser/me');
    return res.data;
  },
};

// ─── Campaign API ─────────────────────────────────────────────────────────────

export const campaignApi = {
  list: async (): Promise<Campaign[]> => {
    const res = await advClient.get<Campaign[]>('/advertiser/campaigns');
    return res.data;
  },

  create: async (data: Partial<Campaign>): Promise<Campaign> => {
    const res = await advClient.post<Campaign>('/advertiser/campaigns', data);
    return res.data;
  },

  get: async (id: number): Promise<Campaign> => {
    const res = await advClient.get<Campaign>(`/advertiser/campaigns/${id}`);
    return res.data;
  },

  update: async (id: number, data: Partial<Campaign>): Promise<Campaign> => {
    const res = await advClient.patch<Campaign>(`/advertiser/campaigns/${id}`, data);
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await advClient.delete(`/advertiser/campaigns/${id}`);
  },

  stats: async (): Promise<DashboardStats> => {
    const res = await advClient.get<DashboardStats>('/advertiser/dashboard-stats');
    return res.data;
  },

  uploadMedia: async (file: File, campaignName?: string, zoneIds?: string): Promise<{ file_url: string; media_type: string; content_id: number }> => {
    const formData = new FormData();
    formData.append('file', file);
    if (campaignName) formData.append('campaign_name', campaignName);
    if (zoneIds) formData.append('zone_ids', zoneIds);
    const token = localStorage.getItem('geocast_adv_token') || localStorage.getItem('geocast_token');
    const headers: Record<string, string> = {
      'Content-Type': 'multipart/form-data',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await advClient.post<{ file_url: string; media_type: string; content_id: number }>(
      '/advertiser/upload-media',
      formData,
      { headers }
    );
    return res.data;
  },
};

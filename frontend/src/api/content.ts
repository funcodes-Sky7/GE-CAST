import apiClient from './client';
import type { Content } from '../types';

export const contentApi = {
  list: async (): Promise<Content[]> => {
    const res = await apiClient.get<Content[]>('/content');
    return res.data;
  },

  upload: async (formData: FormData): Promise<Content> => {
    const res = await apiClient.post<Content>('/content/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  delete: async (contentId: number): Promise<void> => {
    await apiClient.delete(`/content/${contentId}`);
  },
};

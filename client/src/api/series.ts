import { axiosClient } from './axiosClient';
import type { Series } from '@/types/api';

export const seriesApi = {
  list: () => axiosClient.get<Series[]>('/series').then((r) => r.data),
  get: (id: number) => axiosClient.get<Series>(`/series/${id}`).then((r) => r.data),
  create: (input: { name: string; multiplier: number; status: 'ACTIVE' | 'INACTIVE' }) =>
    axiosClient.post<Series>('/series', input).then((r) => r.data),
  update: (id: number, input: Partial<{ name: string; multiplier: number; status: 'ACTIVE' | 'INACTIVE' }>) =>
    axiosClient.put<Series>(`/series/${id}`, input).then((r) => r.data),
  remove: (id: number) => axiosClient.delete(`/series/${id}`),
};

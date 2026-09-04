import { axiosClient } from './axiosClient';
import type { DrawSlot } from '@/types/api';

export const drawSlotsApi = {
  list: () => axiosClient.get<DrawSlot[]>('/draw-slots').then((r) => r.data),
  get: (id: number) => axiosClient.get<DrawSlot>(`/draw-slots/${id}`).then((r) => r.data),
  create: (input: { name: string; salesOpenTime: string; drawCloseTime: string; isActive: boolean }) =>
    axiosClient.post<DrawSlot>('/draw-slots', input).then((r) => r.data),
  update: (id: number, input: Partial<{ name: string; salesOpenTime: string; drawCloseTime: string; isActive: boolean }>) =>
    axiosClient.put<DrawSlot>(`/draw-slots/${id}`, input).then((r) => r.data),
  remove: (id: number) => axiosClient.delete(`/draw-slots/${id}`),
};

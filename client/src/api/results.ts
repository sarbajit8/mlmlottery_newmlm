import { axiosClient } from './axiosClient';
import type { DrawResult, DrawResultInput, DrawResultListItem, DrawResultWinnerEntry, Paginated } from '@/types/api';

export const resultsApi = {
  list: (params: { drawDate?: string; drawSlotId?: number; page?: number; pageSize?: number }) =>
    axiosClient.get<Paginated<DrawResultListItem>>('/results', { params }).then((r) => r.data),
  get: (id: number) => axiosClient.get<DrawResult>(`/results/${id}`).then((r) => r.data),
  declare: (input: DrawResultInput) => axiosClient.post<DrawResult>('/results', input).then((r) => r.data),
  update: (id: number, input: DrawResultInput) => axiosClient.put<DrawResult>(`/results/${id}`, input).then((r) => r.data),
  remove: (id: number) => axiosClient.delete(`/results/${id}`),
  randomTicket: (drawSlotId: number, drawDate: string) =>
    axiosClient.get<{ ticketNumber: string }>('/results/random-ticket', { params: { drawSlotId, drawDate } }).then((r) => r.data),
  listWinners: (params: { drawDate?: string; drawSlotId?: number; mine?: boolean; page?: number; pageSize?: number }) =>
    axiosClient.get<Paginated<DrawResultWinnerEntry>>('/results/winners', { params }).then((r) => r.data),
};

import { axiosClient } from './axiosClient';
import type { Paginated, Ticket, TicketBatch, TicketSummaryCard } from '@/types/api';

export interface TicketGenInput {
  drawSlotId: number;
  drawDate: string;
  seriesId: number;
  prefix: string;
  startNumber: number;
  quantity: number;
  pricePerTicket?: number;
}

export interface PreviewResult {
  totalTickets: number;
  firstTicketNumber: string;
  lastTicketNumber: string;
  semValuePerTicket: string;
  pricePerTicket: string;
  totalSemValue: string;
  totalAmount: string;
}

export const ticketsApi = {
  preview: (input: TicketGenInput) => axiosClient.post<PreviewResult>('/tickets/preview', input).then((r) => r.data),
  generate: (input: TicketGenInput) => axiosClient.post<TicketBatch>('/tickets/generate', input).then((r) => r.data),
  summary: (drawDate?: string) => axiosClient.get<TicketSummaryCard[]>('/tickets/summary', { params: { drawDate } }).then((r) => r.data),
  listBatches: (params: { drawDate?: string; drawSlotId?: number; status?: string; page?: number; pageSize?: number }) =>
    axiosClient.get<Paginated<TicketBatch>>('/tickets/batches', { params }).then((r) => r.data),
  getBatch: (id: number) => axiosClient.get<TicketBatch & { counts: Record<string, number> }>(`/tickets/batches/${id}`).then((r) => r.data),
  getBatchTickets: (id: number, params: { status?: string; search?: string; page?: number; pageSize?: number }) =>
    axiosClient.get<Paginated<Ticket>>(`/tickets/batches/${id}/tickets`, { params }).then((r) => r.data),
  exportBatchUrl: (id: number) => `/tickets/batches/${id}/export`,
  lockBatch: (id: number) => axiosClient.post<TicketBatch>(`/tickets/batches/${id}/lock`).then((r) => r.data),
  search: (params: { drawSlotId: number; drawDate: string; seriesId?: number; q?: string; page?: number; pageSize?: number }) =>
    axiosClient.get<Paginated<Ticket>>('/tickets/search', { params }).then((r) => r.data),
};

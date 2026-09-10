import { axiosClient } from './axiosClient';
import type { Paginated, Receipt, SaleResult, SalesReport } from '@/types/api';

export const salesApi = {
  create: (input: {
    ticketIds: number[];
    customer: { name: string; mobile: string; whatsapp?: string; email?: string };
  }) => axiosClient.post<SaleResult>('/sales', input).then((r) => r.data),
  list: (params: { from?: string; to?: string; agentId?: number; page?: number; pageSize?: number }) =>
    axiosClient.get<Paginated<Receipt>>('/sales', { params }).then((r) => r.data),
  report: (params: { from?: string; to?: string; agentId?: number; page?: number; pageSize?: number }) =>
    axiosClient.get<SalesReport>('/sales/report', { params }).then((r) => r.data),
  get: (id: number) => axiosClient.get<Receipt>(`/sales/${id}`).then((r) => r.data),
};

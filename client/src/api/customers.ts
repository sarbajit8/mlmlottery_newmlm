import { axiosClient } from './axiosClient';
import type { Customer, Paginated } from '@/types/api';

export const customersApi = {
  list: (params: { search?: string; page?: number; pageSize?: number }) =>
    axiosClient.get<Paginated<Customer>>('/customers', { params }).then((r) => r.data),
  get: (id: number) => axiosClient.get<Customer & { receipts: any[] }>(`/customers/${id}`).then((r) => r.data),
  lookup: (mobile: string) => axiosClient.get<Customer | null>('/customers/lookup', { params: { mobile } }).then((r) => r.data),
};

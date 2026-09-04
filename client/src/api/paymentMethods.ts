import { axiosClient } from './axiosClient';
import type { PaymentMethod } from '@/types/api';

export const paymentMethodsApi = {
  list: () => axiosClient.get<PaymentMethod[]>('/payment-methods').then((r) => r.data),
  active: () => axiosClient.get<PaymentMethod>('/payment-methods/active').then((r) => r.data),
  create: (input: { label: string; upiId: string; qrImage: string; isActive?: boolean }) =>
    axiosClient.post<PaymentMethod>('/payment-methods', input).then((r) => r.data),
  update: (id: number, input: { label?: string; upiId?: string; qrImage?: string }) =>
    axiosClient.put<PaymentMethod>(`/payment-methods/${id}`, input).then((r) => r.data),
  activate: (id: number) => axiosClient.put<PaymentMethod>(`/payment-methods/${id}/activate`).then((r) => r.data),
  remove: (id: number) => axiosClient.delete(`/payment-methods/${id}`).then((r) => r.data),
};

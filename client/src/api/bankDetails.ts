import { axiosClient } from './axiosClient';
import type { BankDetailsRequest, BankDetailsStatus, MyBankDetails, Paginated } from '@/types/api';

export interface BankDetailsInput {
  bankAccountHolder: string;
  bankAccountNumber: string;
  bankIfsc: string;
  bankName?: string;
  upiId?: string;
}

export const bankDetailsApi = {
  me: () => axiosClient.get<MyBankDetails>('/bank-details/me').then((r) => r.data),
  submit: (input: BankDetailsInput) => axiosClient.post<MyBankDetails & { applied: boolean }>('/bank-details/me', input).then((r) => r.data),
  listRequests: (params: { status?: BankDetailsStatus; page?: number; pageSize?: number }) =>
    axiosClient.get<Paginated<BankDetailsRequest>>('/bank-details/requests', { params }).then((r) => r.data),
  processRequest: (id: number, status: 'APPROVED' | 'REJECTED', rejectionReason?: string) =>
    axiosClient.put<BankDetailsRequest>(`/bank-details/requests/${id}`, { status, rejectionReason }).then((r) => r.data),
};

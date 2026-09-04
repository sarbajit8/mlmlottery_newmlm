import { axiosClient } from './axiosClient';
import type { DepositRequest, DepositStatus, Paginated, WalletRules, WalletTransaction, WalletTransfer, WithdrawalRequest, WithdrawalStatus } from '@/types/api';

export const walletApi = {
  get: () => axiosClient.get<{ balance: string }>('/wallet').then((r) => r.data),
  rules: () => axiosClient.get<WalletRules>('/wallet/rules').then((r) => r.data),
  transactions: (params: { page?: number; pageSize?: number }) =>
    axiosClient.get<Paginated<WalletTransaction>>('/wallet/transactions', { params }).then((r) => r.data),
  requestWithdrawal: (amount: number) => axiosClient.post<WithdrawalRequest>('/wallet/withdrawals', { amount }).then((r) => r.data),
  listWithdrawals: (params: { status?: WithdrawalStatus; page?: number; pageSize?: number }) =>
    axiosClient.get<Paginated<WithdrawalRequest>>('/wallet/withdrawals', { params }).then((r) => r.data),
  processWithdrawal: (id: number, status: 'APPROVED' | 'REJECTED' | 'PAID') =>
    axiosClient.put<WithdrawalRequest>(`/wallet/withdrawals/${id}`, { status }).then((r) => r.data),
  withdrawalsBankExportUrl: (status?: WithdrawalStatus) =>
    `/wallet/withdrawals/export${status ? `?status=${status}` : ''}`,
  requestDeposit: (input: { amount: number; transactionId: string; paymentMethodId?: number }) =>
    axiosClient.post<DepositRequest>('/wallet/deposits', input).then((r) => r.data),
  listDeposits: (params: { status?: DepositStatus; page?: number; pageSize?: number }) =>
    axiosClient.get<Paginated<DepositRequest>>('/wallet/deposits', { params }).then((r) => r.data),
  processDeposit: (id: number, status: 'APPROVED' | 'REJECTED') =>
    axiosClient.put<DepositRequest>(`/wallet/deposits/${id}`, { status }).then((r) => r.data),
  adminCredit: (input: { userId: number; amount: number; note?: string }) =>
    axiosClient.post<DepositRequest>('/wallet/deposits/credit', input).then((r) => r.data),
  adminDebit: (input: { userId: number; amount: number; note?: string }) =>
    axiosClient.post<WalletTransaction>('/wallet/debit', input).then((r) => r.data),
  transfer: (input: { toReferralCode: string; amount: number }) =>
    axiosClient.post<WalletTransfer>('/wallet/transfer', input).then((r) => r.data),
  listTransfers: (params: { page?: number; pageSize?: number }) =>
    axiosClient.get<Paginated<WalletTransfer>>('/wallet/transfers', { params }).then((r) => r.data),
};

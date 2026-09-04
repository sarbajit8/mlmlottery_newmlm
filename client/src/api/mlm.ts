import { axiosClient } from './axiosClient';
import type { CommissionLedgerEntry, MlmSettings, Paginated, TreeNode } from '@/types/api';

export interface UpdateMlmSettingsInput {
  maxLevels: number;
  commissionBase: 'SEM_VALUE' | 'PRICE' | 'FLAT';
  flatAmount?: number;
  payoutMode: 'INSTANT' | 'BATCH';
  minPayoutThreshold: number;
  shortfallPolicy: 'FORFEIT' | 'ROLLUP_TO_ADMIN';
  levelPercentages: { levelNumber: number; percentage: number }[];
}

export const mlmApi = {
  getSettings: () => axiosClient.get<MlmSettings>('/mlm/settings').then((r) => r.data),
  getSettingsHistory: () => axiosClient.get<MlmSettings[]>('/mlm/settings/history').then((r) => r.data),
  updateSettings: (input: UpdateMlmSettingsInput) =>
    axiosClient.put<{ settings: MlmSettings; warning: string | null }>('/mlm/settings', input).then((r) => r.data),

  getMyTree: () => axiosClient.get<TreeNode>('/mlm/tree/me').then((r) => r.data),
  getTree: (userId: number) => axiosClient.get<TreeNode>(`/mlm/tree/${userId}`).then((r) => r.data),
  getMyDownline: () => axiosClient.get('/mlm/downline/me').then((r) => r.data),

  recruit: (input: { name: string; email: string; mobile: string; whatsapp?: string; password: string }) =>
    axiosClient.post('/mlm/recruit', input).then((r) => r.data),

  listCommissions: (params: { from?: string; to?: string; level?: number; agentId?: number; page?: number; pageSize?: number }) =>
    axiosClient.get<Paginated<CommissionLedgerEntry>>('/mlm/commissions', { params }).then((r) => r.data),

  payoutReport: (params: { from?: string; to?: string }) => axiosClient.get('/mlm/commission-report', { params }).then((r) => r.data),

  leaderboard: (params: { type: 'personal' | 'team'; from?: string; to?: string; limit?: number }) =>
    axiosClient.get('/mlm/leaderboard', { params }).then((r) => r.data),
};

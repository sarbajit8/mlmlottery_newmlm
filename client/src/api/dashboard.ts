import { axiosClient } from './axiosClient';
import type { AdminDashboard, AgentDashboard } from '@/types/api';

export const dashboardApi = {
  admin: () => axiosClient.get<AdminDashboard>('/dashboard/admin').then((r) => r.data),
  agent: () => axiosClient.get<AgentDashboard>('/dashboard/agent').then((r) => r.data),
};

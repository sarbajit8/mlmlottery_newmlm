import { axiosClient } from './axiosClient';
import type { Paginated } from '@/types/api';

export interface AuditLogEntry {
  id: number;
  actorId: number | null;
  action: string;
  entityType: string;
  entityId: number | null;
  metadata: unknown;
  createdAt: string;
  actor?: { id: number; name: string; role: string } | null;
}

export interface PublicSettings {
  companyName: string;
  logoUrl: string | null;
  ticketBasePrice: number;
}

export interface AppSettingRow {
  key: string;
  value: unknown;
}

export const systemApi = {
  activityLogs: (params: { actorId?: number; entityType?: string; from?: string; to?: string; page?: number; pageSize?: number }) =>
    axiosClient.get<Paginated<AuditLogEntry>>('/system/activity-logs', { params }).then((r) => r.data),
  roles: () => axiosClient.get('/system/roles').then((r) => r.data),
  settings: () => axiosClient.get<AppSettingRow[]>('/system/settings').then((r) => r.data),
  upsertSetting: (key: string, value: unknown) => axiosClient.put(`/system/settings/${key}`, { value }).then((r) => r.data),
  publicSettings: () => axiosClient.get<PublicSettings>('/system/public-settings').then((r) => r.data),
};

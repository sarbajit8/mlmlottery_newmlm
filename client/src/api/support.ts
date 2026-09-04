import { axiosClient } from './axiosClient';
import type { Paginated, SupportMessage, SupportThreadSummary } from '@/types/api';

export const supportApi = {
  send: (input: { message: string; agentId?: number }) => axiosClient.post<SupportMessage>('/support/messages', input).then((r) => r.data),
  // agentId is required for an admin viewing a specific agent's thread; agents never pass it (the
  // server always scopes them to their own thread regardless).
  messages: (params: { agentId?: number; page?: number; pageSize?: number }) =>
    axiosClient.get<Paginated<SupportMessage>>('/support/messages', { params }).then((r) => r.data),
  threads: (params: { page?: number; pageSize?: number }) =>
    axiosClient.get<Paginated<SupportThreadSummary>>('/support/threads', { params }).then((r) => r.data),
  unreadCount: () => axiosClient.get<{ count: number }>('/support/unread-count').then((r) => r.data),
};

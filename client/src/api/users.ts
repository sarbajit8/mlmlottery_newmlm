import { axiosClient } from './axiosClient';
import type { Paginated, Role, User, UserStatus } from '@/types/api';

export interface ListUsersParams {
  role?: Role;
  status?: UserStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}

export const usersApi = {
  list: (params: ListUsersParams) => axiosClient.get<Paginated<User>>('/users', { params }).then((r) => r.data),
  get: (id: number) => axiosClient.get<User>(`/users/${id}`).then((r) => r.data),
  create: (input: {
    name: string;
    email: string;
    mobile: string;
    whatsapp?: string;
    password: string;
    sponsorId?: number | null;
    autoApprove: boolean;
  }) => axiosClient.post<User>('/users', input).then((r) => r.data),
  setStatus: (id: number, status: UserStatus) => axiosClient.put<User>(`/users/${id}/status`, { status }).then((r) => r.data),
  setPassword: (id: number, password: string) => axiosClient.put(`/users/${id}/password`, { password }),
};

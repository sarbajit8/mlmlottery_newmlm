import { axiosClient } from './axiosClient';
import type { User } from '@/types/api';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export const authApi = {
  login: (email: string, password: string) => axiosClient.post<LoginResponse>('/auth/login', { email, password }).then((r) => r.data),
  logout: () => axiosClient.post('/auth/logout'),
  me: () => axiosClient.get<User>('/auth/me').then((r) => r.data),
  registerAgent: (input: { name: string; email: string; mobile: string; whatsapp?: string; password: string; referralCode?: string }) =>
    axiosClient.post<User>('/auth/register-agent', input).then((r) => r.data),
};

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types/api';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  setAuth: (tokens: { accessToken: string; refreshToken: string }, user: User) => void;
  setTokens: (tokens: { accessToken: string; refreshToken: string }) => void;
  updateUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setAuth: (tokens, user) => set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, user }),
      setTokens: (tokens) => set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }),
      updateUser: (user) => set({ user }),
      logout: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: 'mlmlottery-auth' },
  ),
);

export function isAdminPanelRole(role?: string | null) {
  return role === 'SUPER_ADMIN';
}

export function isAgentPanelRole(role?: string | null) {
  return role === 'AGENT';
}

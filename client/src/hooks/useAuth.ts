import { useAuthStore } from '@/store/authStore';

export function useAuth() {
  const { user, accessToken, logout } = useAuthStore();
  return { user, isAuthenticated: Boolean(accessToken && user), logout };
}

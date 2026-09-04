import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { isAdminPanelRole, isAgentPanelRole } from '@/store/authStore';

export function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function AdminOnlyRoute() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdminPanelRole(user.role)) return <Navigate to="/agent" replace />;
  return <Outlet />;
}

export function AgentOnlyRoute() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!isAgentPanelRole(user.role)) return <Navigate to="/admin" replace />;
  return <Outlet />;
}

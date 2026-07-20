import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export function ProtectedRoute() {
  const { member, isReady } = useAuth();

  if (!isReady) return null;
  if (!member) return <Navigate to="/login" replace />;

  return <Outlet />;
}

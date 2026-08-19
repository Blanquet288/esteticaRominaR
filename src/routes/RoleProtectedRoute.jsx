import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from '../components/ui/LoadingScreen';

export default function RoleProtectedRoute({ permission, anyOf, allOf }) {
  const { hasPermission, hasAnyPermission, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  const allowed = allOf?.length
    ? allOf.every((key) => hasPermission(key))
    : anyOf?.length
      ? hasAnyPermission(anyOf)
      : hasPermission(permission);

  if (!allowed) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

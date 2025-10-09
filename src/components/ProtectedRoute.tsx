import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuth } = useAuth();

  if (!isAuth) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}

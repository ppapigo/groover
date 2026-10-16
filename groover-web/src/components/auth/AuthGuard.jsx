import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import ErrorNotice from '@/components/ErrorNotice';

export function AuthGuard() {
  const { user, isLoading, error, retry } = useAuth();
  const location = useLocation();
  if (isLoading) return <div className="full-loading" role="status">로그인 정보를 확인하는 중…</div>;
  if (error) return <ErrorNotice error={error} retry={retry} />;
  if (!user) return <Navigate replace to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} />;
  return <Outlet />;
}

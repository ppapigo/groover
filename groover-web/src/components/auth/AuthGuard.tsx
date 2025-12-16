// src/components/auth/AuthGuard.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // 로딩 중이면 대기
    if (isLoading) return;

    // 토큰이 있는지 확인
    const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('accessToken');

    if (!user && !hasToken) {
      // 유저도 없고 토큰도 없으면 로그인으로
      const redirectUrl = encodeURIComponent(pathname);
      router.push(`/login?redirect=${redirectUrl}`);
    } else {
      setChecked(true);
    }
  }, [isLoading, user, router, pathname]);

  // 로딩 중이거나 체크 안 됐으면 로딩 표시
  if (isLoading || !checked) {
    return fallback || (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #eee', borderTopColor: '#0f62fe', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return <>{children}</>;
}
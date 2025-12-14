'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { setAccessToken } from '@/lib/api';

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const token = searchParams.get('token');
    const redirect = searchParams.get('redirect') || '/';
    
    if (token) {
      setAccessToken(token);
      // 약간의 딜레이 후 리다이렉트 (토큰 저장 완료 대기)
      setTimeout(() => {
        router.push(redirect);
      }, 100);
    } else {
      router.push('/login');
    }
  }, [searchParams, router]);

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '16px'
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '3px solid #f0f0f0',
        borderTopColor: '#0f62fe',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }} />
      <p style={{ color: '#666' }}>로그인 처리 중...</p>
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>로딩 중...</p>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
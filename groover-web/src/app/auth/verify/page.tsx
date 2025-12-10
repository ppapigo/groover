// src/app/auth/verify/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { setAccessToken } from '@/lib/api';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('유효하지 않은 인증 링크입니다.');
      return;
    }

    verifyEmail();
  }, [token]);

  const verifyEmail = async () => {
    try {
      const res = await api.get(`/auth/verify?token=${token}`);
      
      if (res.data?.data?.accessToken) {
        setAccessToken(res.data.data.accessToken);
      }

      setStatus('success');
      setMessage('이메일 인증이 완료되었습니다!');

      // 3초 후 홈으로 이동
      setTimeout(() => {
        router.push('/');
      }, 3000);
    } catch (error: any) {
      setStatus('error');
      setMessage(
        error.response?.data?.message || '인증에 실패했습니다. 다시 시도해주세요.'
      );
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5',
        padding: 20,
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: 40,
          maxWidth: 400,
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        {status === 'loading' && (
          <>
            <div
              style={{
                width: 60,
                height: 60,
                border: '4px solid #f0f0f0',
                borderTop: '4px solid #0f62fe',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 24px',
              }}
            />
            <h1 style={{ fontSize: 20, color: '#333', marginBottom: 8 }}>
              이메일 인증 중...
            </h1>
            <p style={{ color: '#666' }}>잠시만 기다려주세요.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div
              style={{
                width: 60,
                height: 60,
                background: '#22c55e',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                fontSize: 32,
              }}
            >
              ✓
            </div>
            <h1 style={{ fontSize: 20, color: '#333', marginBottom: 8 }}>
              인증 완료!
            </h1>
            <p style={{ color: '#666', marginBottom: 24 }}>{message}</p>
            <p style={{ color: '#999', fontSize: 14 }}>
              잠시 후 자동으로 이동합니다...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div
              style={{
                width: 60,
                height: 60,
                background: '#ef4444',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                fontSize: 32,
                color: '#fff',
              }}
            >
              ✕
            </div>
            <h1 style={{ fontSize: 20, color: '#333', marginBottom: 8 }}>
              인증 실패
            </h1>
            <p style={{ color: '#666', marginBottom: 24 }}>{message}</p>
            <button
              onClick={() => router.push('/login')}
              style={{
                padding: '12px 24px',
                background: '#0f62fe',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              로그인 페이지로
            </button>
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

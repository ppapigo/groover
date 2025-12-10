// src/app/login/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');
  setIsLoading(true);

  try {
    await login(email, password);
    router.push('/');
  } catch (err: any) {
    const errorCode = err.response?.data?.code;
    if (errorCode === 'EMAIL_NOT_VERIFIED') {
      // 이메일 미인증 시 인증 대기 페이지로 이동
      router.push(`/auth/verify-pending?email=${encodeURIComponent(email)}`);
    } else {
      setError(err.response?.data?.message || '로그인에 실패했습니다.');
    }
  } finally {
    setIsLoading(false);
  }
};

  const handleGoogleLogin = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/v1';
    window.location.href = `${apiUrl}/auth/google`;
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#fff',
      }}
    >
      {/* 로고 */}
      <div style={{ padding: '60px 24px 40px', textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '8px' }}>🛒</div>
        <h1 style={{ fontSize: '28px', fontWeight: '700' }}>Groover</h1>
        <p style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
          쇼핑 블로그 플랫폼
        </p>
      </div>

      {/* 폼 */}
      <form
        onSubmit={handleSubmit}
        style={{
          flex: 1,
          padding: '0 24px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {error && (
          <div
            style={{
              padding: '12px',
              background: '#fee2e2',
              color: '#ef4444',
              borderRadius: '8px',
              fontSize: '13px',
              marginBottom: '16px',
            }}
          >
            {error}
          </div>
        )}

        {/* 이메일 */}
        <div style={{ marginBottom: '16px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '500',
              marginBottom: '8px',
              color: '#333',
            }}
          >
            이메일
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@email.com"
            style={{
              width: '100%',
              padding: '14px 16px',
              border: '1px solid #ddd',
              borderRadius: '10px',
              fontSize: '16px',
              outline: 'none',
            }}
          />
        </div>

        {/* 비밀번호 */}
        <div style={{ marginBottom: '24px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '500',
              marginBottom: '8px',
              color: '#333',
            }}
          >
            비밀번호
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호 입력"
            style={{
              width: '100%',
              padding: '14px 16px',
              border: '1px solid #ddd',
              borderRadius: '10px',
              fontSize: '16px',
              outline: 'none',
            }}
          />
        </div>

        {/* 로그인 버튼 */}
        <button
          type="submit"
          disabled={isLoading || !email || !password}
          style={{
            width: '100%',
            padding: '16px',
            background: email && password ? '#0f62fe' : '#ccc',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: email && password ? 'pointer' : 'not-allowed',
          }}
        >
          {isLoading ? '로그인 중...' : '로그인'}
        </button>

        {/* 비밀번호 찾기 */}
        <Link
          href="/forgot-password"
          style={{
            display: 'block',
            textAlign: 'center',
            marginTop: '16px',
            fontSize: '13px',
            color: '#666',
            textDecoration: 'none',
          }}
        >
          비밀번호를 잊으셨나요?
        </Link>

        {/* 구분선 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            margin: '32px 0',
          }}
        >
          <div style={{ flex: 1, height: '1px', background: '#eee' }} />
          <span style={{ fontSize: '12px', color: '#999' }}>또는</span>
          <div style={{ flex: 1, height: '1px', background: '#eee' }} />
        </div>

        {/* Google 로그인 */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          style={{
            width: '100%',
            padding: '14px',
            background: '#fff',
            color: '#333',
            border: '1px solid #ddd',
            borderRadius: '10px',
            fontSize: '15px',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google로 계속하기
        </button>

        {/* 회원가입 링크 */}
        <div
          style={{
            marginTop: 'auto',
            padding: '24px 0',
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: '14px', color: '#666' }}>
            아직 계정이 없으신가요?{' '}
          </span>
          <Link
            href="/signup"
            style={{
              fontSize: '14px',
              color: '#0f62fe',
              fontWeight: '600',
              textDecoration: 'none',
            }}
          >
            회원가입
          </Link>
        </div>
      </form>
    </div>
  );
}

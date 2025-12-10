// src/app/signup/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isFormValid = 
    isValidEmail(email) && 
    name.trim().length > 0 && 
    password.length >= 6 && 
    password === passwordConfirm && 
    agreeTerms;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid) return;

    setIsLoading(true);
    setError('');

    try {
      await api.post('/auth/register', { email, password, name });
      // 이메일 인증 대기 페이지로 이동
      router.push(`/auth/verify-pending?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      setError(err.response?.data?.message || '회원가입에 실패했습니다.');
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
      {/* 헤더 */}
      <header
        style={{
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <button
          onClick={() => router.push('/login')}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
          }}
        >
          ←
        </button>
        <span style={{ fontSize: '16px', fontWeight: '600' }}>회원가입</span>
      </header>

      {/* 콘텐츠 */}
      <form
        onSubmit={handleSubmit}
        style={{
          flex: 1,
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>
          Groover 가입하기
        </h2>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '32px' }}>
          쇼핑 블로그 플랫폼에 오신 것을 환영합니다!
        </p>

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
          {email && !isValidEmail(email) && (
            <p style={{ marginTop: '6px', fontSize: '12px', color: '#ef4444' }}>
              올바른 이메일 형식을 입력해주세요.
            </p>
          )}
        </div>

        {/* 이름 */}
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
            이름 (닉네임)
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름 또는 닉네임"
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
            비밀번호
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="6자 이상"
            style={{
              width: '100%',
              padding: '14px 16px',
              border: '1px solid #ddd',
              borderRadius: '10px',
              fontSize: '16px',
              outline: 'none',
            }}
          />
          {password && password.length < 6 && (
            <p style={{ marginTop: '6px', fontSize: '12px', color: '#ef4444' }}>
              비밀번호는 6자 이상이어야 합니다.
            </p>
          )}
        </div>

        {/* 비밀번호 확인 */}
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
            비밀번호 확인
          </label>
          <input
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            placeholder="비밀번호 재입력"
            style={{
              width: '100%',
              padding: '14px 16px',
              border: '1px solid #ddd',
              borderRadius: '10px',
              fontSize: '16px',
              outline: 'none',
            }}
          />
          {passwordConfirm && password !== passwordConfirm && (
            <p style={{ marginTop: '6px', fontSize: '12px', color: '#ef4444' }}>
              비밀번호가 일치하지 않습니다.
            </p>
          )}
        </div>

        {/* 약관 동의 */}
        <div
          style={{
            padding: '14px',
            background: '#f8f9fa',
            borderRadius: '10px',
            marginBottom: '24px',
          }}
        >
          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              style={{ marginTop: '2px' }}
            />
            <span style={{ fontSize: '13px', color: '#666' }}>
              <Link href="/terms" style={{ color: '#0f62fe', textDecoration: 'underline' }}>
                이용약관
              </Link>{' '}
              및{' '}
              <Link href="/privacy" style={{ color: '#0f62fe', textDecoration: 'underline' }}>
                개인정보처리방침
              </Link>
              에 동의합니다.
            </span>
          </label>
        </div>

        {/* 가입 버튼 */}
        <button
          type="submit"
          disabled={isLoading || !isFormValid}
          style={{
            width: '100%',
            padding: '16px',
            background: isFormValid ? '#0f62fe' : '#ccc',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: isFormValid ? 'pointer' : 'not-allowed',
          }}
        >
          {isLoading ? '가입 중...' : '가입하기'}
        </button>

        {/* 구분선 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            margin: '24px 0',
          }}
        >
          <div style={{ flex: 1, height: '1px', background: '#eee' }} />
          <span style={{ fontSize: '12px', color: '#999' }}>또는</span>
          <div style={{ flex: 1, height: '1px', background: '#eee' }} />
        </div>

        {/* Google 가입 */}
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

        {/* 로그인 링크 */}
        <div
          style={{
            marginTop: 'auto',
            padding: '24px 0',
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: '14px', color: '#666' }}>
            이미 계정이 있으신가요?{' '}
          </span>
          <Link
            href="/login"
            style={{
              fontSize: '14px',
              color: '#0f62fe',
              fontWeight: '600',
              textDecoration: 'none',
            }}
          >
            로그인
          </Link>
        </div>
      </form>
    </div>
  );
}
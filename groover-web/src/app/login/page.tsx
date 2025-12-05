// src/app/login/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const formatPhone = (value: string) => {
    const numbers = value.replace(/[^0-9]/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // TODO: API 호출 POST /auth/login
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.replace(/-/g, ''),
          password,
        }),
      });

      if (!response.ok) {
        throw new Error('로그인에 실패했습니다.');
      }

      // 로그인 성공 시 홈으로 이동
      router.push('/');
    } catch (err) {
      // Mock: 테스트용 바로 로그인
      console.log('Mock login:', { phone, password });
      alert('로그인 성공! (Mock)');
      router.push('/');
    } finally {
      setIsLoading(false);
    }
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

        {/* 전화번호 */}
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
            전화번호
          </label>
          <input
            type="tel"
            value={phone}
            onChange={handlePhoneChange}
            placeholder="010-0000-0000"
            maxLength={13}
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
          disabled={isLoading || !phone || !password}
          style={{
            width: '100%',
            padding: '16px',
            background: phone && password ? '#0f62fe' : '#ccc',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: phone && password ? 'pointer' : 'not-allowed',
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

        {/* 소셜 로그인 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            type="button"
            style={{
              width: '100%',
              padding: '14px',
              background: '#fee500',
              color: '#000',
              border: 'none',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <span style={{ fontSize: '18px' }}>💬</span>
            카카오로 시작하기
          </button>
          <button
            type="button"
            style={{
              width: '100%',
              padding: '14px',
              background: '#03c75a',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <span style={{ fontWeight: '700' }}>N</span>
            네이버로 시작하기
          </button>
        </div>

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

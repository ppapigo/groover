// src/components/layout/AppHeader.tsx
'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export default function AppHeader() {
  const { user, isLoading, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/';
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  return (
    <header style={{
      background: '#000',
      color: '#fff',
      padding: '16px 20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <Link href="/" style={{ textDecoration: 'none', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '24px' }}>🛒</span>
          <span style={{ fontSize: '20px', fontWeight: 'bold' }}>Groover</span>
        </div>
      </Link>

      <nav style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link href="/blog" style={{ color: '#fff', textDecoration: 'none' }}>
          블로그
        </Link>
        
        {isLoading ? (
          <span style={{ color: '#999' }}>...</span>
        ) : user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link href="/write" style={{ 
              color: '#000', 
              background: '#fff',
              padding: '8px 16px',
              borderRadius: '20px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '600',
            }}>
              글쓰기
            </Link>
            <Link href="/profile" style={{ color: '#fff', textDecoration: 'none' }}>
              {user.name || '프로필'}
            </Link>
            <button
              onClick={handleLogout}
              style={{
                background: 'transparent',
                border: '1px solid #fff',
                color: '#fff',
                padding: '8px 16px',
                borderRadius: '20px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              로그아웃
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link href="/login" style={{ color: '#fff', textDecoration: 'none' }}>
              로그인
            </Link>
            <Link href="/signup" style={{ 
              color: '#000', 
              background: '#fff',
              padding: '8px 16px',
              borderRadius: '20px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '600',
            }}>
              회원가입
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
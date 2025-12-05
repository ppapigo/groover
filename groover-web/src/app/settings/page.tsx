// src/app/settings/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { AuthGuard } from '@/components/auth/AuthGuard';

export default function SettingsPage() {
  const router = useRouter();
  const { logout, logoutAll } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const handleLogoutAll = async () => {
    await logoutAll();
    router.push('/login');
  };

  const menuItems = [
    { 
      title: '계정', 
      items: [
        { label: '프로필 수정', href: '/profile/edit', icon: '👤' },
        { label: '비밀번호 변경', href: '/settings/password', icon: '🔒' },
      ]
    },
    { 
      title: '알림', 
      items: [
        { label: '알림 설정', href: '/settings/notifications', icon: '🔔' },
      ]
    },
    { 
      title: '기타', 
      items: [
        { label: '고객센터', href: '/help', icon: '💬' },
        { label: '이용약관', href: '/terms', icon: '📋' },
        { label: '개인정보처리방침', href: '/privacy', icon: '🔐' },
        { label: '앱 버전', href: '#', icon: 'ℹ️', value: '1.0.0' },
      ]
    },
  ];

  return (
    <AuthGuard>
      <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
        {/* 헤더 */}
        <header style={{ 
          padding: '16px', 
          background: '#fff',
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          borderBottom: '1px solid #eee'
        }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>
            ←
          </button>
          <span style={{ fontSize: '16px', fontWeight: '600' }}>설정</span>
        </header>

        {/* 메뉴 그룹 */}
        <div style={{ padding: '16px' }}>
          {menuItems.map((group, groupIdx) => (
            <div key={groupIdx} style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '13px', color: '#999', marginBottom: '8px', paddingLeft: '4px' }}>
                {group.title}
              </h3>
              <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden' }}>
                {group.items.map((item, itemIdx) => (
                  <Link 
                    key={itemIdx} 
                    href={item.href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px',
                      borderBottom: itemIdx < group.items.length - 1 ? '1px solid #eee' : 'none',
                      textDecoration: 'none',
                      color: 'inherit',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span>{item.icon}</span>
                      <span style={{ fontSize: '15px' }}>{item.label}</span>
                    </div>
                    {item.value ? (
                      <span style={{ fontSize: '14px', color: '#999' }}>{item.value}</span>
                    ) : (
                      <span style={{ color: '#ccc' }}>›</span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}

          {/* 로그아웃 */}
          <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden' }}>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              style={{
                width: '100%',
                padding: '16px',
                background: 'none',
                border: 'none',
                fontSize: '15px',
                color: '#ef4444',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              로그아웃
            </button>
          </div>

          <button
            onClick={handleLogoutAll}
            style={{
              width: '100%',
              padding: '16px',
              marginTop: '12px',
              background: 'none',
              border: 'none',
              fontSize: '14px',
              color: '#999',
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            모든 기기에서 로그아웃
          </button>
        </div>

        {/* 로그아웃 확인 모달 */}
        {showLogoutConfirm && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}>
            <div style={{
              background: '#fff',
              borderRadius: '16px',
              padding: '24px',
              width: '280px',
              textAlign: 'center',
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>
                로그아웃
              </h3>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>
                정말 로그아웃 하시겠습니까?
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#f5f5f5',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '15px',
                    cursor: 'pointer',
                  }}
                >
                  취소
                </button>
                <button
                  onClick={handleLogout}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '15px',
                    cursor: 'pointer',
                  }}
                >
                  로그아웃
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}

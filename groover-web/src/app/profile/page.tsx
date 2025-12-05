// src/app/profile/page.tsx
import Link from 'next/link';
import AppHeader from '@/components/layout/AppHeader';

const mockUser = {
  name: '쇼핑러버',
  email: 'user@groover.com',
  posts: 12,
  followers: 234,
  totalEarnings: 285000,
  pendingAds: 1, // 대기중인 광고 제안
  unreadMessages: 2, // 읽지 않은 메시지
};

export default function ProfilePage() {
  return (
    <>
      <AppHeader />
      <div style={{ padding: '16px', paddingBottom: '80px' }}>
        {/* 프로필 헤더 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#0f62fe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              color: '#fff',
            }}
          >
            👤
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700' }}>{mockUser.name}</h2>
            <p style={{ fontSize: '13px', color: '#666' }}>{mockUser.email}</p>
          </div>
          <Link
            href="/profile/edit"
            style={{
              padding: '8px 12px',
              fontSize: '12px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              color: '#666',
              textDecoration: 'none',
            }}
          >
            프로필 수정
          </Link>
        </div>

        {/* 통계 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              textAlign: 'center',
              padding: '16px',
              background: '#f8f9fa',
              borderRadius: '12px',
            }}
          >
            <p style={{ fontSize: '20px', fontWeight: '700' }}>{mockUser.posts}</p>
            <p style={{ fontSize: '12px', color: '#666' }}>게시글</p>
          </div>
          <div
            style={{
              textAlign: 'center',
              padding: '16px',
              background: '#f8f9fa',
              borderRadius: '12px',
            }}
          >
            <p style={{ fontSize: '20px', fontWeight: '700' }}>{mockUser.followers}</p>
            <p style={{ fontSize: '12px', color: '#666' }}>팔로워</p>
          </div>
          <div
            style={{
              textAlign: 'center',
              padding: '16px',
              background: '#f8f9fa',
              borderRadius: '12px',
            }}
          >
            <p style={{ fontSize: '20px', fontWeight: '700' }}>
              {(mockUser.totalEarnings / 10000).toFixed(1)}만
            </p>
            <p style={{ fontSize: '12px', color: '#666' }}>수익</p>
          </div>
        </div>

        {/* 수익 관리 섹션 */}
        <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#666', marginBottom: '10px' }}>
          💰 수익 관리
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
          <Link
            href="/wallet"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '14px 16px',
              background: '#fff',
              border: '1px solid #eee',
              borderRadius: '12px',
              textDecoration: 'none',
              color: '#333',
            }}
          >
            <span style={{ fontSize: '20px' }}>💳</span>
            <span style={{ flex: 1, fontSize: '14px' }}>내 지갑</span>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#22c55e' }}>
              {mockUser.totalEarnings.toLocaleString()}원
            </span>
          </Link>
          <Link
            href="/profile/ads"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '14px 16px',
              background: '#fff',
              border: '1px solid #eee',
              borderRadius: '12px',
              textDecoration: 'none',
              color: '#333',
            }}
          >
            <span style={{ fontSize: '20px' }}>📢</span>
            <span style={{ flex: 1, fontSize: '14px' }}>광고 제안 관리</span>
            {mockUser.pendingAds > 0 && (
              <span
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: '600',
                  padding: '2px 8px',
                  borderRadius: '999px',
                }}
              >
                {mockUser.pendingAds}
              </span>
            )}
          </Link>
          <Link
            href="/profile/bank"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '14px 16px',
              background: '#fff',
              border: '1px solid #eee',
              borderRadius: '12px',
              textDecoration: 'none',
              color: '#333',
            }}
          >
            <span style={{ fontSize: '20px' }}>🏦</span>
            <span style={{ flex: 1, fontSize: '14px' }}>정산 계좌 관리</span>
            <span
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '4px',
                background: '#dcfce7',
                color: '#22c55e',
              }}
            >
              인증완료
            </span>
          </Link>
        </div>

        {/* 콘텐츠 섹션 */}
        <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#666', marginBottom: '10px' }}>
          📝 내 콘텐츠
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
          {[
            { href: '/profile/posts', icon: '📄', label: '내 게시글', count: mockUser.posts },
            { href: '/profile/drafts', icon: '✏️', label: '임시 저장', count: 2 },
            { href: '/profile/likes', icon: '❤️', label: '좋아요한 글' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 16px',
                background: '#fff',
                border: '1px solid #eee',
                borderRadius: '12px',
                textDecoration: 'none',
                color: '#333',
              }}
            >
              <span style={{ fontSize: '20px' }}>{item.icon}</span>
              <span style={{ flex: 1, fontSize: '14px' }}>{item.label}</span>
              {item.count !== undefined && (
                <span style={{ fontSize: '13px', color: '#999' }}>{item.count}</span>
              )}
            </Link>
          ))}
        </div>

        {/* 소통 섹션 */}
        <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#666', marginBottom: '10px' }}>
          💬 소통
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
          <Link
            href="/dm"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '14px 16px',
              background: '#fff',
              border: '1px solid #eee',
              borderRadius: '12px',
              textDecoration: 'none',
              color: '#333',
            }}
          >
            <span style={{ fontSize: '20px' }}>💬</span>
            <span style={{ flex: 1, fontSize: '14px' }}>메시지</span>
            {mockUser.unreadMessages > 0 && (
              <span
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: '600',
                  padding: '2px 8px',
                  borderRadius: '999px',
                }}
              >
                {mockUser.unreadMessages}
              </span>
            )}
          </Link>
        </div>

        {/* 기타 */}
        <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#666', marginBottom: '10px' }}>
          ⚙️ 설정
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { href: '/settings', icon: '⚙️', label: '설정' },
            { href: '/help', icon: '❓', label: '고객센터' },
            { href: '/terms', icon: '📋', label: '이용약관' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 16px',
                background: '#fff',
                border: '1px solid #eee',
                borderRadius: '12px',
                textDecoration: 'none',
                color: '#333',
              }}
            >
              <span style={{ fontSize: '20px' }}>{item.icon}</span>
              <span style={{ flex: 1, fontSize: '14px' }}>{item.label}</span>
              <span style={{ color: '#ccc' }}>›</span>
            </Link>
          ))}
        </div>

        {/* 로그아웃 */}
        <button
          style={{
            width: '100%',
            marginTop: '24px',
            padding: '14px',
            background: 'transparent',
            border: '1px solid #ddd',
            borderRadius: '12px',
            fontSize: '14px',
            color: '#999',
            cursor: 'pointer',
          }}
        >
          로그아웃
        </button>

        {/* 버전 */}
        <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '11px', color: '#ccc' }}>
          Groover v1.0.0
        </p>
      </div>
    </>
  );
}

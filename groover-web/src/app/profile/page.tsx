// src/app/profile/page.tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/layout/AppHeader';
import { useAuth } from '@/hooks/useAuth';
import {
  User,
  FileText,
  FileEdit,
  Heart,
  MessageCircle,
  Settings,
  HelpCircle,
  FileCheck,
  ChevronRight,
  LogOut,
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  if (isLoading) {
    return (
      <>
        <AppHeader />
        <div style={{ padding: '40px', textAlign: 'center' }}>로딩 중...</div>
      </>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <>
      <AppHeader />
      <div style={{ padding: '16px', paddingBottom: '80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#0f62fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', overflow: 'hidden' }}>
            {user.profileImageUrl ? (
              <img src={user.profileImageUrl} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <User size={28} />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700' }}>{user.name || '이름 없음'}</h2>
            <p style={{ fontSize: '13px', color: '#666' }}>{user.email}</p>
          </div>
          <Link href="/profile/edit" style={{ padding: '8px 12px', fontSize: '12px', border: '1px solid #ddd', borderRadius: '8px', color: '#666', textDecoration: 'none' }}>
            프로필 수정
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
          <div style={{ textAlign: 'center', padding: '16px', background: '#f8f9fa', borderRadius: '12px' }}>
            <p style={{ fontSize: '20px', fontWeight: '700' }}>0</p>
            <p style={{ fontSize: '12px', color: '#666' }}>게시글</p>
          </div>
          <div style={{ textAlign: 'center', padding: '16px', background: '#f8f9fa', borderRadius: '12px' }}>
            <p style={{ fontSize: '20px', fontWeight: '700' }}>0</p>
            <p style={{ fontSize: '12px', color: '#666' }}>팔로워</p>
          </div>
          <div style={{ textAlign: 'center', padding: '16px', background: '#f8f9fa', borderRadius: '12px' }}>
            <p style={{ fontSize: '20px', fontWeight: '700' }}>0</p>
            <p style={{ fontSize: '12px', color: '#666' }}>팔로잉</p>
          </div>
        </div>

        <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#666', marginBottom: '10px' }}>내 콘텐츠</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
          <Link href="/profile/posts" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: '#fff', border: '1px solid #eee', borderRadius: '12px', textDecoration: 'none', color: '#333' }}>
            <FileText size={20} color="#666" />
            <span style={{ flex: 1, fontSize: '14px' }}>내 게시글</span>
            <ChevronRight size={18} color="#ccc" />
          </Link>
          <Link href="/profile/drafts" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: '#fff', border: '1px solid #eee', borderRadius: '12px', textDecoration: 'none', color: '#333' }}>
            <FileEdit size={20} color="#666" />
            <span style={{ flex: 1, fontSize: '14px' }}>임시 저장</span>
            <ChevronRight size={18} color="#ccc" />
          </Link>
          <Link href="/profile/likes" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: '#fff', border: '1px solid #eee', borderRadius: '12px', textDecoration: 'none', color: '#333' }}>
            <Heart size={20} color="#666" />
            <span style={{ flex: 1, fontSize: '14px' }}>좋아요한 글</span>
            <ChevronRight size={18} color="#ccc" />
          </Link>
        </div>

        <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#666', marginBottom: '10px' }}>소통</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
          <Link href="/messages" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: '#fff', border: '1px solid #eee', borderRadius: '12px', textDecoration: 'none', color: '#333' }}>
            <MessageCircle size={20} color="#666" />
            <span style={{ flex: 1, fontSize: '14px' }}>메시지</span>
            <ChevronRight size={18} color="#ccc" />
          </Link>
        </div>

        <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#666', marginBottom: '10px' }}>설정</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Link href="/settings" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: '#fff', border: '1px solid #eee', borderRadius: '12px', textDecoration: 'none', color: '#333' }}>
            <Settings size={20} color="#666" />
            <span style={{ flex: 1, fontSize: '14px' }}>설정</span>
            <ChevronRight size={18} color="#ccc" />
          </Link>
          <Link href="/help" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: '#fff', border: '1px solid #eee', borderRadius: '12px', textDecoration: 'none', color: '#333' }}>
            <HelpCircle size={20} color="#666" />
            <span style={{ flex: 1, fontSize: '14px' }}>고객센터</span>
            <ChevronRight size={18} color="#ccc" />
          </Link>
          <Link href="/terms" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: '#fff', border: '1px solid #eee', borderRadius: '12px', textDecoration: 'none', color: '#333' }}>
            <FileCheck size={20} color="#666" />
            <span style={{ flex: 1, fontSize: '14px' }}>이용약관</span>
            <ChevronRight size={18} color="#ccc" />
          </Link>
        </div>

        <button onClick={handleLogout} style={{ width: '100%', marginTop: '24px', padding: '14px', background: 'transparent', border: '1px solid #ddd', borderRadius: '12px', fontSize: '14px', color: '#999', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <LogOut size={18} />
          로그아웃
        </button>

        <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '11px', color: '#ccc' }}>Groover v1.0.0</p>
      </div>
    </>
  );
}
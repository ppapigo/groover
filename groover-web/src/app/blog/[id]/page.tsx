// src/app/profile/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppHeader from '@/components/layout/AppHeader';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

interface UserProfile {
  id: string;
  name: string;
  profileImageUrl: string | null;
  createdAt: string;
  stats: {
    postCount: number;
    likeCount: number;
    followerCount: number;
    followingCount: number;
  };
}

interface Post {
  id: string;
  title: string;
  excerpt: string;
  previewImage: string | null;
  slug: string;
  viewCount: number;
  likeCount: number;
}

export default function UserProfilePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  const isMyProfile = user?.id === params.id;

  useEffect(() => {
    fetchProfile();
  }, [params.id]);

  const fetchProfile = async () => {
    try {
      const res = await api.get(`/users/${params.id}`);
      setProfile(res.data.data);
      setIsFollowing(res.data.data.isFollowing || false);
      
      const postsRes = await api.get(`/users/${params.id}/posts`);
      setPosts(postsRes.data.data.items || []);
    } catch (err) {
      // Mock 데이터
      setProfile({
        id: params.id,
        name: '사용자',
        profileImageUrl: null,
        createdAt: new Date().toISOString(),
        stats: { postCount: 12, likeCount: 234, followerCount: 156, followingCount: 89 },
      });
      setPosts([
        {
          id: '1',
          title: '육아템 총정리!',
          excerpt: '첫째 키우면서 유용했던 육아템들',
          previewImage: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=300',
          slug: 'baby-items',
          viewCount: 1520,
          likeCount: 234,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!isAuthenticated) {
      if (confirm('로그인이 필요합니다.')) router.push('/login');
      return;
    }
    try {
      isFollowing ? await api.delete(`/users/${params.id}/follow`) : await api.post(`/users/${params.id}/follow`);
    } catch {}
    setIsFollowing(!isFollowing);
  };

  if (isLoading) return <><AppHeader /><div style={{ padding: '40px', textAlign: 'center' }}>로딩 중...</div></>;
  if (!profile) return <><AppHeader /><div style={{ padding: '40px', textAlign: 'center' }}>사용자를 찾을 수 없습니다.</div></>;

  return (
    <>
      <AppHeader />
      <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
        <div style={{ background: '#fff', padding: '24px 16px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>
              {profile.profileImageUrl ? <img src={profile.profileImageUrl} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : '👤'}
            </div>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: '700' }}>{profile.name}</h1>
              <p style={{ fontSize: '13px', color: '#999' }}>{new Date(profile.createdAt).toLocaleDateString('ko-KR')} 가입</p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-around', padding: '16px 0', borderTop: '1px solid #eee', borderBottom: '1px solid #eee', marginBottom: '16px' }}>
            <div style={{ textAlign: 'center' }}><div style={{ fontWeight: '700' }}>{profile.stats.postCount}</div><div style={{ fontSize: '12px', color: '#999' }}>게시글</div></div>
            <div style={{ textAlign: 'center' }}><div style={{ fontWeight: '700' }}>{profile.stats.followerCount}</div><div style={{ fontSize: '12px', color: '#999' }}>팔로워</div></div>
            <div style={{ textAlign: 'center' }}><div style={{ fontWeight: '700' }}>{profile.stats.followingCount}</div><div style={{ fontSize: '12px', color: '#999' }}>팔로잉</div></div>
          </div>

          {isMyProfile ? (
            <Link href="/profile/edit" style={{ display: 'block', padding: '12px', background: '#f5f5f5', borderRadius: '10px', textAlign: 'center', textDecoration: 'none', color: '#333', fontWeight: '600' }}>프로필 수정</Link>
          ) : (
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={handleFollow} style={{ flex: 1, padding: '12px', background: isFollowing ? '#f5f5f5' : '#0f62fe', color: isFollowing ? '#333' : '#fff', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}>{isFollowing ? '팔로잉' : '팔로우'}</button>
              <button onClick={() => router.push(`/messages?user=${params.id}`)} style={{ flex: 1, padding: '12px', background: '#f5f5f5', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}>메시지</button>
            </div>
          )}
        </div>

        <div style={{ padding: '16px' }}>
          {posts.map(post => (
            <Link key={post.id} href={`/blog/${post.slug || post.id}`} style={{ display: 'flex', background: '#fff', borderRadius: '12px', overflow: 'hidden', marginBottom: '12px', textDecoration: 'none', color: 'inherit' }}>
              {post.previewImage && <div style={{ width: '100px', height: '100px', background: `url(${post.previewImage}) center/cover` }} />}
              <div style={{ padding: '12px', flex: 1 }}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>{post.title}</h3>
                <p style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>{post.excerpt}</p>
                <div style={{ fontSize: '12px', color: '#999' }}>👁 {post.viewCount} ❤️ {post.likeCount}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
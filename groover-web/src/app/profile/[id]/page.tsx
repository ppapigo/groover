'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppHeader from '@/components/layout/AppHeader';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

export default function UserProfilePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  const isMyProfile = user?.id === params.id;

  useEffect(() => {
    fetchProfile();
  }, [params.id]);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/users/' + params.id);
      const userData = res.data.data || res.data;
      setProfile({
        ...userData,
        stats: userData.stats || { postCount: 0, likeCount: 0, followerCount: 0, followingCount: 0 },
      });

      // 유저의 글 목록 가져오기
      try {
        const postsRes = await api.get(`/blog/users/${params.id}/posts`);
        const postsData = postsRes.data.data?.items || postsRes.data.items || postsRes.data || [];
        setPosts(Array.isArray(postsData) ? postsData : []);
      } catch {
        setPosts([]);
      }
    } catch (err) {
      console.error('프로필 불러오기 실패:', err);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollow = () => {
    if (!isAuthenticated) { router.push('/login'); return; }
    setIsFollowing(!isFollowing);
  };

  const handleMessage = async () => {
    if (!isAuthenticated) { 
      router.push('/login'); 
      return; 
    }
    try {
      const res = await api.post('/dm/start', { targetUserId: params.id });
      const threadId = res.data.data?.id || res.data.id;
      router.push(`/messages/${threadId}`);
    } catch (err) {
      console.error('DM 시작 실패:', err);
      alert('메시지를 시작할 수 없습니다.');
    }
  };

  if (isLoading) return <><AppHeader /><div style={{ padding: 40, textAlign: 'center' }}>로딩 중...</div></>;
  if (!profile) return <><AppHeader /><div style={{ padding: 40, textAlign: 'center' }}>사용자를 찾을 수 없습니다.</div></>;

  // 비공개 프로필
  if (profile.isProfilePublic === false && !isMyProfile) {
    return (
      <>
        <AppHeader />
        <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
          <div style={{ background: '#fff', padding: '24px 16px', textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 16px' }}>🔒</div>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>{profile.name}</h1>
            <p style={{ fontSize: 14, color: '#999', marginTop: 8 }}>비공개 프로필입니다.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader />
      <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
        <div style={{ background: '#fff', padding: '24px 16px', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, overflow: 'hidden' }}>
              {profile.profileImageUrl ? (
                <img src={profile.profileImageUrl} alt={profile.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : '👤'}
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700 }}>{profile.name}</h1>
              <p style={{ fontSize: 13, color: '#999' }}>{new Date(profile.createdAt).toLocaleDateString('ko-KR')} 가입</p>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-around', padding: '16px 0', borderTop: '1px solid #eee', borderBottom: '1px solid #eee', marginBottom: 16 }}>
            <div style={{ textAlign: 'center' }}><div style={{ fontWeight: 700 }}>{profile.stats?.postCount || posts.length}</div><div style={{ fontSize: 12, color: '#999' }}>게시글</div></div>
            <div style={{ textAlign: 'center' }}><div style={{ fontWeight: 700 }}>{profile.stats?.followerCount || 0}</div><div style={{ fontSize: 12, color: '#999' }}>팔로워</div></div>
            <div style={{ textAlign: 'center' }}><div style={{ fontWeight: 700 }}>{profile.stats?.followingCount || 0}</div><div style={{ fontSize: 12, color: '#999' }}>팔로잉</div></div>
          </div>
          {isMyProfile ? (
            <Link href="/profile/edit" style={{ display: 'block', padding: 12, background: '#f5f5f5', borderRadius: 10, textAlign: 'center', textDecoration: 'none', color: '#333', fontWeight: 600 }}>프로필 수정</Link>
          ) : (
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={handleFollow} style={{ flex: 1, padding: 12, background: isFollowing ? '#f5f5f5' : '#0f62fe', color: isFollowing ? '#333' : '#fff', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>{isFollowing ? '팔로잉' : '팔로우'}</button>
              <button onClick={handleMessage} style={{ flex: 1, padding: 12, background: '#f5f5f5', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>메시지</button>
            </div>
          )}
        </div>
        <div style={{ padding: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>게시글</h2>
          {posts.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>아직 게시글이 없습니다.</div>
          ) : (
            posts.map(post => (
              <Link key={post.id} href={'/blog/' + (post.slug || post.id)} style={{ display: 'flex', background: '#fff', borderRadius: 12, overflow: 'hidden', marginBottom: 12, textDecoration: 'none', color: 'inherit' }}>
                {post.previewImage && <div style={{ width: 100, height: 100, background: `url(${post.previewImage}) center/cover`, flexShrink: 0 }} />}
                <div style={{ padding: 12, flex: 1 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{post.title}</h3>
                  <p style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>{post.excerpt}</p>
                  <div style={{ fontSize: 12, color: '#999' }}>👁 {post.viewCount || 0} ❤️ {post.likeCount || 0}</div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </>
  );
}
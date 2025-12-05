// src/app/liked/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthGuard } from '@/components/auth/AuthGuard';
import api from '@/lib/api';

interface Post {
  id: string;
  title: string;
  excerpt: string;
  previewImage: string | null;
  slug: string;
  author: { name: string };
  likeCount: number;
  publishedAt: string;
}

export default function LikedPostsPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLikedPosts();
  }, []);

  const fetchLikedPosts = async () => {
    try {
      const res = await api.get('/blog/liked');
      setPosts(res.data.data.items || []);
    } catch (err) {
      console.error('Failed to fetch liked posts:', err);
    } finally {
      setIsLoading(false);
    }
  };

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
          <span style={{ fontSize: '16px', fontWeight: '600' }}>좋아요한 글</span>
        </header>

        {/* 글 목록 */}
        <div style={{ padding: '16px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              로딩 중...
            </div>
          ) : posts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>❤️</div>
              <p style={{ color: '#666', marginBottom: '24px' }}>좋아요한 글이 없습니다.</p>
              <Link href="/" style={{
                display: 'inline-block',
                padding: '12px 24px',
                background: '#0f62fe',
                color: '#fff',
                borderRadius: '10px',
                textDecoration: 'none',
              }}>
                글 둘러보기
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {posts.map(post => (
                <Link key={post.id} href={`/blog/${post.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{
                    background: '#fff',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    display: 'flex',
                  }}>
                    {post.previewImage && (
                      <div style={{
                        width: '100px',
                        height: '100px',
                        background: `url(${post.previewImage}) center/cover`,
                        flexShrink: 0,
                      }} />
                    )}
                    <div style={{ flex: 1, padding: '12px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px', lineHeight: 1.3 }}>
                        {post.title}
                      </h3>
                      <p style={{ fontSize: '13px', color: '#666', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {post.excerpt}
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#999' }}>
                        <span>{post.author?.name}</span>
                        <span>❤️ {post.likeCount}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}

// src/app/blog/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppHeader from '@/components/layout/AppHeader';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

interface Post {
  id: string;
  title: string;
  content: string;
  previewImage: string | null;
  tags: string[];
  viewCount: number;
  likeCount: number;
  publishedAt: string;
  author: {
    id: string;
    name: string;
    profileImage?: string;
  };
}

export default function BlogDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    fetchPost();
  }, [params.id]);

  const fetchPost = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/v1'}/blog/posts/${params.id}`
      );
      const data = await res.json();
      if (data.success) {
        setPost(data.data);
      }
    } catch (err) {
      console.error('글 불러오기 실패:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLike = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    try {
      const token = localStorage.getItem('accessToken');
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/v1'}/blog/posts/${params.id}/like`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setIsLiked(!isLiked);
      if (post) {
        setPost({ ...post, likeCount: post.likeCount + (isLiked ? -1 : 1) });
      }
    } catch (err) {
      console.error('좋아요 실패:', err);
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

  if (!post) {
    return (
      <>
        <AppHeader />
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <p>글을 찾을 수 없습니다.</p>
          <Link href="/blog" style={{ color: '#0f62fe' }}>목록으로 돌아가기</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader />
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
        {/* 대표 이미지 */}
       {post.previewImage && !post.content.includes('![') && (
            <img
              src={post.previewImage}
              alt={post.title}
              style={{
                width: '100%',
                maxHeight: '400px',
                objectFit: 'cover',
                borderRadius: '12px',
                marginBottom: '20px',
              }}
            />
          )}

        

        {/* 제목 */}
        <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '16px' }}>
          {post.title}
        </h1>

        {/* 작성자 정보 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <Link href={`/profile/${post.author.id}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'inherit' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: '#eee',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {post.author.profileImage ? (
                <img src={post.author.profileImage} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : '👤'}
            </div>
            <span style={{ fontWeight: '600' }}>{post.author.name}</span>
          </Link>
          <span style={{ color: '#999', fontSize: '14px' }}>
            {new Date(post.publishedAt).toLocaleDateString('ko-KR')}
          </span>
        </div>

        {/* 태그 */}
        {post.tags && post.tags.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
            {post.tags.map(tag => (
              <span key={tag} style={{
                padding: '4px 12px',
                background: '#e8f4ff',
                color: '#0f62fe',
                borderRadius: '20px',
                fontSize: '14px',
              }}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* 본문 */}
        <div style={{
            fontSize: '16px',
            lineHeight: '1.8',
            marginBottom: '40px',
          }}>
            {post.content.split('\n').map((line, index) => {
              // 마크다운 이미지 파싱: ![alt](url)
              const imageMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
              if (imageMatch) {
                return (
                  <img
                    key={index}
                    src={imageMatch[2]}
                    alt={imageMatch[1]}
                    style={{
                      maxWidth: '100%',
                      borderRadius: '8px',
                      margin: '16px 0',
                    }}
                  />
                );
              }
              return <p key={index} style={{ margin: '8px 0' }}>{line || '\u00A0'}</p>;
            })}
          </div>

        {/* 좋아요 / 조회수 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          padding: '20px 0',
          borderTop: '1px solid #eee',
          borderBottom: '1px solid #eee',
        }}>
          <button
            onClick={handleLike}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px',
              color: isLiked ? '#ef4444' : '#666',
            }}
          >
            {isLiked ? '❤️' : '🤍'} {post.likeCount}
          </button>
          <span style={{ color: '#999' }}>👁 {post.viewCount}</span>
        </div>

        {/* 목록으로 */}
        <div style={{ marginTop: '20px' }}>
          <Link href="/blog" style={{
            display: 'inline-block',
            padding: '12px 24px',
            background: '#f5f5f5',
            borderRadius: '8px',
            textDecoration: 'none',
            color: '#333',
          }}>
            ← 목록으로
          </Link>
        </div>
      </div>
    </>
  );
}
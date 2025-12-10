// src/app/blog/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppHeader from '@/components/layout/AppHeader';
import { useAuth } from '@/hooks/useAuth';
import { InArticleAd, BannerAd } from '@/components/ad/AdBanner';

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

// 광고 슬롯 ID (AdSense에서 광고 단위 생성 후 교체 필요)
const AD_SLOTS = {
  IN_ARTICLE: '4567890123',
  BOTTOM: '5678901234',
};

// 마크다운 이미지를 포함한 콘텐츠를 렌더링하는 컴포넌트
const MarkdownContent = ({ content, showAd = false, adSlot }: { content: string; showAd?: boolean; adSlot?: string }) => {
  if (!content) return null;

  const parts = content.split(/(!\[[^\]]*\]\([^)]+\))/g);
  
  let paragraphCount = 0;
  let adShown = false;

  return (
    <>
      {parts.map((part, index) => {
        const imageMatch = part.match(/!\[([^\]]*)\]\(([^)]+)\)/);
        
        if (imageMatch) {
          const [, alt, url] = imageMatch;
          return (
            <img
              key={index}
              src={url}
              alt={alt || '이미지'}
              style={{
                maxWidth: '100%',
                height: 'auto',
                borderRadius: '8px',
                margin: '16px 0',
                display: 'block',
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          );
        }

        if (part.trim()) {
          const lines = part.split('\n').filter(line => line.trim());
          
          return (
            <div key={index}>
              {lines.map((line, lineIndex) => {
                paragraphCount++;
                const shouldShowAd = showAd && !adShown && paragraphCount === 4 && adSlot;
                if (shouldShowAd) adShown = true;
                
                return (
                  <div key={lineIndex}>
                    <p style={{ margin: '8px 0', minHeight: '1.5em' }}>
                      {line || '\u00A0'}
                    </p>
                    {shouldShowAd && <InArticleAd slot={adSlot!} />}
                  </div>
                );
              })}
            </div>
          );
        }

        return null;
      })}
    </>
  );
};

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

  const hasContentImages = post.content.includes('![');
  const showInArticleAd = post.content.length > 500;

  return (
    <>
      <AppHeader />
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
        {/* 대표 이미지 */}
        {post.previewImage && !hasContentImages && (
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
          <Link 
            href={`/profile/${post.author.id}`} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              textDecoration: 'none', 
              color: 'inherit' 
            }}
          >
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: '#eee',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}>
              {post.author.profileImage ? (
                <img 
                  src={post.author.profileImage} 
                  alt={post.author.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
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
              <Link 
                key={tag} 
                href={`/blog?tag=${encodeURIComponent(tag)}`}
                style={{
                  padding: '4px 12px',
                  background: '#e8f4ff',
                  color: '#0f62fe',
                  borderRadius: '20px',
                  fontSize: '14px',
                  textDecoration: 'none',
                }}
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}

        {/* 본문 */}
        <div style={{ fontSize: '16px', lineHeight: '1.8', marginBottom: '40px' }}>
          <MarkdownContent 
            content={post.content} 
            showAd={showInArticleAd} 
            adSlot={AD_SLOTS.IN_ARTICLE} 
          />
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

        {/* 하단 광고 */}
        <BannerAd slot={AD_SLOTS.BOTTOM} position="bottom" />

        {/* 수정/삭제 버튼 (작성자만) */}
        {user && post.author.id === user.id && (
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            marginTop: '20px',
            paddingBottom: '20px',
            borderBottom: '1px solid #eee',
          }}>
            <Link 
              href={`/write?edit=${post.id}`}
              style={{
                padding: '8px 16px',
                background: '#0f62fe',
                color: '#fff',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '14px',
              }}
            >
              수정하기
            </Link>
            <button
              onClick={async () => {
                if (confirm('정말 삭제하시겠습니까?')) {
                  try {
                    const token = localStorage.getItem('accessToken');
                    await fetch(
                      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/v1'}/blog/posts/${post.id}`,
                      {
                        method: 'DELETE',
                        headers: { Authorization: `Bearer ${token}` },
                      }
                    );
                    alert('삭제되었습니다.');
                    router.push('/blog');
                  } catch (err) {
                    alert('삭제에 실패했습니다.');
                  }
                }
              }}
              style={{
                padding: '8px 16px',
                background: '#ef4444',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              삭제하기
            </button>
          </div>
        )}

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

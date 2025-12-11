// src/app/blog/[slug]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
    profileImageUrl?: string;
  };
}

const AD_SLOTS = {
  IN_ARTICLE: '4567890123',
  BOTTOM: '5678901234',
};

// 시간 포맷팅
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR', { 
    year: 'numeric',
    month: 'long', 
    day: 'numeric' 
  });
}

// 마크다운 콘텐츠 렌더러
function MarkdownContent({ 
  content, 
  showAd = false, 
  adSlot 
}: { 
  content: string; 
  showAd?: boolean; 
  adSlot?: string;
}) {
  if (!content) return null;

  const parts = content.split(/(!\[[^\]]*\]\([^)]+\))/g);
  let paragraphCount = 0;
  let adShown = false;

  return (
    <div className="space-y-4">
      {parts.map((part, index) => {
        const imageMatch = part.match(/!\[([^\]]*)\]\(([^)]+)\)/);
        
        if (imageMatch) {
          const [, alt, url] = imageMatch;
          return (
            <div key={index} className="relative -mx-5 md:mx-0 md:rounded-xl overflow-hidden">
              <img
                src={url}
                alt={alt || '이미지'}
                className="w-full h-auto"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
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
                    <p className="text-base leading-relaxed text-text-primary">
                      {line || '\u00A0'}
                    </p>
                    {shouldShowAd && (
                      <div className="my-6">
                        <InArticleAd slot={adSlot!} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}

// 로딩 스켈레톤
function DetailSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-64 bg-card-soft" />
      <div className="px-5 py-6 space-y-4">
        <div className="h-8 bg-card-soft rounded w-3/4" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-card-soft rounded-full" />
          <div className="space-y-2">
            <div className="h-4 bg-card-soft rounded w-24" />
            <div className="h-3 bg-card-soft rounded w-16" />
          </div>
        </div>
        <div className="space-y-3 pt-4">
          <div className="h-4 bg-card-soft rounded w-full" />
          <div className="h-4 bg-card-soft rounded w-full" />
          <div className="h-4 bg-card-soft rounded w-2/3" />
        </div>
      </div>
    </div>
  );
}

export default function BlogDetailPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    fetchPost();
  }, [params.slug]);

  const fetchPost = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/v1'}/blog/posts/${params.slug}`
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
    if (!post) return;
    
    try {
      const token = localStorage.getItem('accessToken');
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/v1'}/blog/posts/${post.id}/like`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setIsLiked(!isLiked);
      setPost({ ...post, likeCount: post.likeCount + (isLiked ? -1 : 1) });
    } catch (err) {
      console.error('좋아요 실패:', err);
    }
  };

  const handleDelete = async () => {
    if (!post) return;
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
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
  };

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <header className="sticky top-0 z-20 bg-white border-b border-border">
          <div className="flex items-center h-14 px-4">
            <button onClick={() => router.back()} className="p-2 -ml-2">
              <svg className="w-6 h-6 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </header>
        <DetailSkeleton />
      </div>
    );
  }

  // 글 없음
  if (!post) {
    return (
      <div className="min-h-screen bg-white">
        <header className="sticky top-0 z-20 bg-white border-b border-border">
          <div className="flex items-center h-14 px-4">
            <button onClick={() => router.back()} className="p-2 -ml-2">
              <svg className="w-6 h-6 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </header>
        <div className="empty-state">
          <div className="empty-state-icon">😢</div>
          <p className="empty-state-text mb-4">글을 찾을 수 없습니다</p>
          <Link href="/blog" className="btn-primary">
            목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const hasContentImages = post.content.includes('![');
  const showInArticleAd = post.content.length > 500;

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* 헤더 */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <svg className="w-6 h-6 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          {/* 공유 버튼 */}
          <button 
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: post.title, url: window.location.href });
              } else {
                navigator.clipboard.writeText(window.location.href);
                alert('링크가 복사되었습니다!');
              }
            }}
            className="p-2 -mr-2"
          >
            <svg className="w-6 h-6 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
        </div>
      </header>

      {/* 대표 이미지 */}
      {post.previewImage && !hasContentImages && (
        <div className="relative aspect-video w-full overflow-hidden bg-card-soft">
          <img
            src={post.previewImage}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* 콘텐츠 */}
      <article className="px-5 py-6">
        {/* 제목 */}
        <h1 className="text-2xl font-bold text-text-primary leading-tight mb-5">
          {post.title}
        </h1>

        {/* 작성자 정보 */}
        <Link 
          href={`/profile/${post.author.id}`}
          className="flex items-center gap-3 mb-5"
        >
          <div className="w-11 h-11 rounded-full bg-card-soft overflow-hidden flex items-center justify-center">
            {post.author.profileImageUrl ? (
              <img 
                src={post.author.profileImageUrl} 
                alt={post.author.name}
                className="w-full h-full object-cover" 
              />
            ) : (
              <span className="text-xl">👤</span>
            )}
          </div>
          <div>
            <p className="font-semibold text-text-primary">{post.author.name}</p>
            <p className="text-sm text-text-tertiary">{formatDate(post.publishedAt)}</p>
          </div>
        </Link>

        {/* 태그 */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {post.tags.map(tag => (
              <Link 
                key={tag} 
                href={`/blog?tag=${encodeURIComponent(tag)}`}
                className="px-3 py-1.5 bg-primary-light text-primary text-sm font-medium rounded-chip"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}

        {/* 구분선 */}
        <div className="divider mb-6" />

        {/* 본문 */}
        <div className="prose-groover">
          <MarkdownContent 
            content={post.content} 
            showAd={showInArticleAd} 
            adSlot={AD_SLOTS.IN_ARTICLE} 
          />
        </div>

        {/* 하단 광고 */}
        <div className="mt-8">
          <BannerAd slot={AD_SLOTS.BOTTOM} position="bottom" />
        </div>

        {/* 수정/삭제 버튼 (작성자만) */}
        {user && post.author.id === user.id && (
          <div className="flex gap-3 mt-6 pt-6 border-t border-border">
            <Link 
              href={`/write?edit=${post.id}`}
              className="btn-primary flex-1 text-center"
            >
              수정하기
            </Link>
            <button
              onClick={handleDelete}
              className="btn-secondary flex-1 text-error"
            >
              삭제하기
            </button>
          </div>
        )}
      </article>

      {/* 하단 고정 바 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border safe-area-pb z-30">
        <div className="max-w-[480px] mx-auto flex items-center justify-between px-5 py-3">
          {/* 좋아요 버튼 */}
          <button
            onClick={handleLike}
            className="flex items-center gap-2"
          >
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center transition-colors
              ${isLiked ? 'bg-red-50' : 'bg-card-soft'}
            `}>
              {isLiked ? (
                <svg className="w-6 h-6 text-error" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              ) : (
                <svg className="w-6 h-6 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              )}
            </div>
            <span className="font-semibold text-text-primary">{post.likeCount}</span>
          </button>

          {/* 조회수 */}
          <div className="flex items-center gap-2 text-text-tertiary">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span className="text-sm">{post.viewCount}</span>
          </div>

          {/* 목록으로 */}
          <Link href="/blog" className="btn-secondary">
            목록으로
          </Link>
        </div>
      </div>
    </div>
  );
}

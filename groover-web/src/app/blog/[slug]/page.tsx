// src/app/blog/[slug]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { ChevronLeft, Share2, Heart, Eye, User } from 'lucide-react';

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

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function MarkdownContent({ content }: { content: string }) {
  if (!content) return null;

  const parts = content.split(/(!\[[^\]]*\]\([^)]+\))/g);

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
              {lines.map((line, lineIndex) => (
                <p key={lineIndex} className="text-base leading-relaxed text-text-primary">
                  {line || '\u00A0'}
                </p>
              ))}
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}

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

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: post?.title, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('링크가 복사되었습니다.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <header className="sticky top-0 z-20 bg-white border-b border-border">
          <div className="flex items-center h-14 px-4">
            <button onClick={() => router.back()} className="p-2 -ml-2">
              <ChevronLeft size={24} />
            </button>
          </div>
        </header>
        <DetailSkeleton />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-white">
        <header className="sticky top-0 z-20 bg-white border-b border-border">
          <div className="flex items-center h-14 px-4">
            <button onClick={() => router.back()} className="p-2 -ml-2">
              <ChevronLeft size={24} />
            </button>
          </div>
        </header>
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <p className="empty-state-text mb-4">글을 찾을 수 없습니다</p>
          <Link href="/blog" className="btn-primary">
            목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const hasContentImages = post.content.includes('![');

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* 헤더 */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ChevronLeft size={24} />
          </button>
          <button onClick={handleShare} className="p-2 -mr-2">
            <Share2 size={22} />
          </button>
        </div>
      </header>

      {/* 썸네일 이미지 */}
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
              <User size={24} className="text-text-tertiary" />
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

        <div className="divider mb-6" />

        {/* 본문 */}
        <div className="prose-groover">
          <MarkdownContent content={post.content} />
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
          <button onClick={handleLike} className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isLiked ? 'bg-red-50' : 'bg-card-soft'}`}>
              <Heart
                size={24}
                className={isLiked ? 'text-error' : 'text-text-tertiary'}
                fill={isLiked ? 'currentColor' : 'none'}
              />
            </div>
            <span className="font-semibold text-text-primary">{post.likeCount}</span>
          </button>

          <div className="flex items-center gap-2 text-text-tertiary">
            <Eye size={20} />
            <span className="text-sm">{post.viewCount}</span>
          </div>

          <Link href="/blog" className="btn-secondary">
            목록으로
          </Link>
        </div>
      </div>
    </div>
  );
}
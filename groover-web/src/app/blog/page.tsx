// src/app/blog/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import AppHeader from '@/components/layout/AppHeader';
import { BannerAd, InFeedAd } from '@/components/ad/AdBanner';
import { useFeed } from '@/hooks/useFeed';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

const categories = ['전체', '육아', '뷰티', '가전', '캠핑', '자취', '패션'];

const AD_SLOTS = {
  TOP_BANNER: '1234567890',
  IN_FEED: '2345678901',
  BOTTOM_BANNER: '3456789012',
};

// 시간 포맷팅 (당근마켓 스타일)
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '방금 전';
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

// 블로그 카드 컴포넌트
interface PostCardProps {
  post: {
    slug: string;
    title: string;
    content?: string;
    previewImage?: string;
    tags?: string[];
    author?: { name: string };
    publishedAt: string;
    viewCount: number;
    likeCount: number;
  };
  index: number;
}

function PostCard({ post, index }: PostCardProps) {
  const excerpt = post.content
    ?.replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/[#*`]/g, '')
    .trim()
    .slice(0, 80);

  return (
    <Link 
      href={`/blog/${post.slug}`}
      className="card-interactive block animate-slide-up"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="flex gap-4 p-4">
        {/* 썸네일 */}
        <div className="relative w-28 h-28 flex-shrink-0 rounded-xl overflow-hidden bg-card-soft">
          {post.previewImage ? (
            <img
              src={post.previewImage}
              alt={post.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl text-text-tertiary">
              📝
            </div>
          )}
        </div>

        {/* 콘텐츠 */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* 제목 */}
          <h3 className="text-base font-semibold text-text-primary line-clamp-2 mb-1">
            {post.title}
          </h3>

          {/* 미리보기 텍스트 */}
          {excerpt && (
            <p className="text-sm text-text-secondary line-clamp-2 mb-auto">
              {excerpt}...
            </p>
          )}

          {/* 메타 정보 */}
          <div className="flex items-center gap-2 mt-2 text-xs text-text-tertiary">
            <span>{post.author?.name}</span>
            <span>·</span>
            <span>{formatTimeAgo(post.publishedAt)}</span>
          </div>

          {/* 통계 */}
          <div className="flex items-center gap-3 mt-1.5 text-xs text-text-tertiary">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {post.viewCount}
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
              {post.likeCount}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// 카테고리 칩
interface CategoryChipProps {
  category: string;
  isActive: boolean;
  onClick: () => void;
}

function CategoryChip({ category, isActive, onClick }: CategoryChipProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex-shrink-0 px-4 py-2 rounded-chip text-sm font-medium transition-all duration-200
        ${isActive 
          ? 'bg-primary text-white shadow-sm' 
          : 'bg-white text-text-secondary border border-border hover:border-primary hover:text-primary'
        }
      `}
    >
      {category}
    </button>
  );
}

// 로딩 스켈레톤
function PostSkeleton() {
  return (
    <div className="card p-4 animate-pulse">
      <div className="flex gap-4">
        <div className="w-28 h-28 bg-card-soft rounded-xl" />
        <div className="flex-1 space-y-3">
          <div className="h-4 bg-card-soft rounded w-3/4" />
          <div className="h-3 bg-card-soft rounded w-full" />
          <div className="h-3 bg-card-soft rounded w-2/3" />
          <div className="h-3 bg-card-soft rounded w-1/3 mt-auto" />
        </div>
      </div>
    </div>
  );
}

export default function BlogPage() {
  const [activeCategory, setActiveCategory] = useState('전체');
  const tag = activeCategory === '전체' ? undefined : activeCategory;
  
  const { posts, isLoading, hasMore, error, loadMore, fetchPosts } = useFeed({ category: tag });
  const { targetRef } = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore,
    isLoading,
  });

  useEffect(() => {
    fetchPosts(null);
  }, [activeCategory]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      
      {/* 페이지 헤더 */}
      <div className="bg-white border-b border-border sticky top-0 z-10">
        <div className="px-5 pt-4 pb-3">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-text-primary">
              오늘의 쇼핑 리뷰
            </h1>
            <div className="flex items-center gap-2">
              {/* 새로고침 버튼 */}
              <button
                onClick={() => fetchPosts(null)}
                disabled={isLoading}
                className="w-9 h-9 rounded-full bg-card-soft flex items-center justify-center text-text-secondary hover:bg-border transition-colors disabled:opacity-50"
              >
                <svg 
                  className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              
              {/* 글쓰기 버튼 */}
              <Link
                href="/write"
                className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white shadow-sm hover:bg-primary-dark transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </Link>
            </div>
          </div>

          {/* 카테고리 필터 */}
          <div className="flex gap-2 overflow-x-auto pb-3 -mx-5 px-5 scrollbar-hide">
            {categories.map((cat) => (
              <CategoryChip
                key={cat}
                category={cat}
                isActive={activeCategory === cat}
                onClick={() => setActiveCategory(cat)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 상단 광고 배너 */}
      <div className="px-5 py-3">
        <BannerAd slot={AD_SLOTS.TOP_BANNER} position="top" />
      </div>

      {/* 에러 표시 */}
      {error && (
        <div className="mx-5 p-4 bg-red-50 border border-red-100 rounded-card text-center">
          <p className="text-error text-sm">{error}</p>
          <button 
            onClick={() => fetchPosts(null)}
            className="mt-2 text-sm text-primary font-medium"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* 포스트 리스트 */}
      <div className="px-5 space-y-3 pb-6">
        {/* 초기 로딩 */}
        {isLoading && (!posts || posts.length === 0) && (
          <>
            <PostSkeleton />
            <PostSkeleton />
            <PostSkeleton />
          </>
        )}

        {/* 포스트 목록 */}
        {(posts || []).map((post, index) => (
          <div key={post.slug}>
            <PostCard post={post} index={index} />
            
            {/* 3번째 글 다음에 인피드 광고 */}
            {index === 2 && (
              <div className="my-3">
                <InFeedAd slot={AD_SLOTS.IN_FEED} />
              </div>
            )}
            
            {/* 7번째 글 다음에 인피드 광고 */}
            {index === 6 && (
              <div className="my-3">
                <InFeedAd slot={AD_SLOTS.IN_FEED} />
              </div>
            )}
          </div>
        ))}

        {/* 추가 로딩 */}
        {isLoading && posts && posts.length > 0 && (
          <div className="flex justify-center py-6">
            <div className="loading-spinner" />
          </div>
        )}

        {/* 더 이상 없음 */}
        {!hasMore && (posts || []).length > 0 && (
          <>
            <div className="my-4">
              <BannerAd slot={AD_SLOTS.BOTTOM_BANNER} position="bottom" />
            </div>
            <p className="text-center text-sm text-text-tertiary py-4">
              모든 글을 불러왔습니다
            </p>
          </>
        )}

        {/* 글 없음 */}
        {!isLoading && (posts || []).length === 0 && !error && (
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <p className="empty-state-text mb-4">
              아직 글이 없습니다
            </p>
            <Link href="/write" className="btn-primary">
              첫 번째 글 작성하기
            </Link>
          </div>
        )}

        {/* 무한스크롤 감지 영역 */}
        <div ref={targetRef} className="h-5" />
      </div>
    </div>
  );
}

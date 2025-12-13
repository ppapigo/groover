// src/app/blog/page.tsx
'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import AppHeader from '@/components/layout/AppHeader';
import { useFeed } from '@/hooks/useFeed';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { Plus, Eye, Heart, Tag, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface FeedTag {
  id: string;
  name: string;
  slug: string;
  postCount: number;
  iconEmoji?: string;
}

function BlogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tagFromUrl = searchParams.get('tag');
  const { user } = useAuth();
  
  const [activeTag, setActiveTag] = useState<string | null>(tagFromUrl);
  const [popularTags, setPopularTags] = useState<FeedTag[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(true);
  
  // Pull to refresh 상태
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const PULL_THRESHOLD = 80;
  
  const { posts, isLoading, hasMore, error, loadMore, fetchPosts } = useFeed({ 
    category: activeTag || undefined 
  });
  
  const { targetRef } = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore,
    isLoading,
  });

  // 인기 태그 불러오기
  useEffect(() => {
    const fetchPopularTags = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/v1'}/tags/feed/popular?limit=10`
        );
        const data = await res.json();
        if (data.success && data.data) {
          setPopularTags(data.data);
        }
      } catch (err) {
        console.error('인기 태그 로딩 실패:', err);
      } finally {
        setIsLoadingTags(false);
      }
    };

    fetchPopularTags();
  }, []);

  // URL의 tag 파라미터 변경 감지
  useEffect(() => {
    setActiveTag(tagFromUrl);
  }, [tagFromUrl]);

  // 태그 변경 시 글 다시 불러오기
  useEffect(() => {
    fetchPosts(null);
  }, [activeTag]);

  // 태그 선택 핸들러
  const handleTagSelect = (tag: string | null) => {
    if (tag) {
      router.push(`/blog?tag=${encodeURIComponent(tag)}`);
    } else {
      router.push('/blog');
    }
  };

  // 글쓰기 버튼 클릭 핸들러
  const handleWriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      if (confirm('글을 작성하려면 로그인이 필요합니다. 로그인하시겠습니까?')) {
        router.push('/login?redirect=/write');
      }
    } else {
      router.push('/write');
    }
  };

  // Pull to refresh 핸들러
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || isRefreshing) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    
    if (diff > 0 && containerRef.current?.scrollTop === 0) {
      const resistance = Math.min(diff * 0.4, PULL_THRESHOLD + 20);
      setPullDistance(resistance);
    }
  }, [isPulling, isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;
    
    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(PULL_THRESHOLD);
      
      await fetchPosts(null);
      
      setTimeout(() => {
        setIsRefreshing(false);
        setPullDistance(0);
      }, 300);
    } else {
      setPullDistance(0);
    }
    
    setIsPulling(false);
  }, [isPulling, pullDistance, isRefreshing, fetchPosts]);

  return (
    <>
      <AppHeader />
      <div 
        ref={containerRef}
        className="blog-page"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ 
          overflowY: 'auto',
          position: 'relative',
        }}
      >
        {/* Pull to refresh 인디케이터 */}
        <div 
          style={{
            height: `${pullDistance}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            transition: isPulling ? 'none' : 'height 0.3s ease',
          }}
        >
          {pullDistance > 0 && (
            <div 
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                color: '#666',
                fontSize: '13px',
              }}
            >
              <div 
                style={{
                  width: '24px',
                  height: '24px',
                  border: '2px solid #ddd',
                  borderTopColor: pullDistance >= PULL_THRESHOLD ? 'var(--primary)' : '#ddd',
                  borderRadius: '50%',
                  animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
                  transform: `rotate(${pullDistance * 2}deg)`,
                }}
              />
              <span>
                {isRefreshing 
                  ? '새로고침 중...' 
                  : pullDistance >= PULL_THRESHOLD 
                    ? '놓아서 새로고침' 
                    : '당겨서 새로고침'
                }
              </span>
            </div>
          )}
        </div>

        {/* 헤더 */}
        <div className="blog-header">
          <h2>오늘의 쇼핑 리뷰</h2>
          <div className="blog-actions">
            <button onClick={handleWriteClick} className="write-btn">
              <Plus size={20} />
            </button>
          </div>
        </div>

        {/* 인기 태그 */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            marginBottom: '12px',
            paddingLeft: '4px',
          }}>
            <Tag size={16} style={{ color: '#666' }} />
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
              인기 태그
            </span>
          </div>
          
          <div 
            className="category-chips"
            style={{
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
              paddingBottom: '8px',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {/* 전체 버튼 */}
            <button
              className={`chip-btn ${!activeTag ? 'active' : ''}`}
              onClick={() => handleTagSelect(null)}
              style={{
                flexShrink: 0,
                padding: '8px 16px',
                borderRadius: '20px',
                border: 'none',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                background: !activeTag ? '#0f62fe' : '#f5f5f5',
                color: !activeTag ? '#fff' : '#333',
                transition: 'all 0.2s',
              }}
            >
              전체
            </button>
            
            {/* 로딩 스켈레톤 */}
            {isLoadingTags && (
              <>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    style={{
                      flexShrink: 0,
                      width: '70px',
                      height: '36px',
                      borderRadius: '20px',
                      background: '#f0f0f0',
                      animation: 'pulse 1.5s infinite',
                    }}
                  />
                ))}
              </>
            )}
            
            {/* 인기 태그 목록 */}
            {!isLoadingTags && popularTags.map((tag) => (
              <button
                key={tag.id}
                className={`chip-btn ${activeTag === tag.name ? 'active' : ''}`}
                onClick={() => handleTagSelect(tag.name)}
                style={{
                  flexShrink: 0,
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  background: activeTag === tag.name ? '#0f62fe' : '#f5f5f5',
                  color: activeTag === tag.name ? '#fff' : '#333',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {tag.iconEmoji && <span>{tag.iconEmoji}</span>}
                #{tag.name}
              </button>
            ))}
          </div>
        </div>

        {/* 선택된 태그 표시 */}
        {activeTag && (
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 16px',
              background: '#e8f4ff',
              borderRadius: '12px',
              marginBottom: '16px',
            }}
          >
            <span style={{ fontSize: '14px', color: '#0f62fe', fontWeight: '500' }}>
              #{activeTag} 태그의 글
            </span>
            <button
              onClick={() => handleTagSelect(null)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={16} style={{ color: '#0f62fe' }} />
            </button>
          </div>
        )}

        {/* 에러 표시 */}
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* 포스트 리스트 */}
        <div className="post-list">
          {(posts || []).map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="post-card">
              <div className="post-thumb-wrapper">
                {post.previewImage ? (
                  <img
                    className="post-thumb"
                    src={post.previewImage}
                    alt={post.title}
                  />
                ) : (
                  <div className="post-thumb-placeholder">📝</div>
                )}
              </div>
              <div className="post-content">
                <h3 className="post-title">{post.title}</h3>
                <p className="post-excerpt">
                  {post.content?.replace(/!\[.*?\]\(.*?\)/g, '').replace(/[#*`]/g, '').slice(0, 60)}...
                </p>
                <div className="post-meta-bottom">
                  <span className="post-author">{post.author?.name}</span>
                  <span className="post-dot">·</span>
                  <span className="post-date">{new Date(post.publishedAt).toLocaleDateString('ko-KR')}</span>
                </div>
                <div className="post-stats">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Eye size={14} /> {post.viewCount}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Heart size={14} /> {post.likeCount}
                  </span>
                </div>
              </div>
            </Link>
          ))}

          {/* 로딩 */}
          {isLoading && (
            <div className="loading">
              <div className="loading-spinner"></div>
            </div>
          )}

          {/* 더 이상 없음 */}
          {!hasMore && (posts || []).length > 0 && (
            <div className="end-message">
              모든 글을 불러왔습니다
            </div>
          )}

          {/* 글 없음 */}
          {!isLoading && (posts || []).length === 0 && !error && (
            <div className="empty-state">
              <div className="empty-icon">📝</div>
              <p className="empty-text">
                {activeTag ? `#${activeTag} 태그의 글이 없습니다` : '아직 글이 없습니다'}
              </p>
              <button onClick={handleWriteClick} className="empty-btn">
                첫 번째 글 작성하기
              </button>
            </div>
          )}

          <div ref={targetRef} style={{ height: '20px' }} />
        </div>
      </div>

      {/* 스피너 애니메이션 CSS */}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </>
  );
}

export default function BlogPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>로딩 중...</p>
      </div>
    }>
      <BlogContent />
    </Suspense>
  );
}
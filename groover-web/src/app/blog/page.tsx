// src/app/blog/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/layout/AppHeader';
import { useFeed } from '@/hooks/useFeed';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

const categories = ['전체', '육아', '뷰티', '가전', '캠핑', '자취', '패션'];

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
    <>
      <AppHeader />
      <div className="blog-page">
        {/* 헤더 */}
        <div className="blog-header">
          <h2>오늘의 쇼핑 리뷰</h2>
          <div className="blog-actions">
            <button
              onClick={() => fetchPosts(null)}
              disabled={isLoading}
              className="refresh-btn"
            >
              🔄
            </button>
            <Link href="/write" className="write-btn">
              +
            </Link>
          </div>
        </div>

        {/* 카테고리 필터 */}
        <div className="category-chips">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`chip-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

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
                  <span>👁 {post.viewCount}</span>
                  <span>❤️ {post.likeCount}</span>
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
              <p className="empty-text">아직 글이 없습니다</p>
              <Link href="/write" className="empty-btn">
                첫 번째 글 작성하기
              </Link>
            </div>
          )}

          <div ref={targetRef} style={{ height: '20px' }} />
        </div>
      </div>
    </>
  );
}
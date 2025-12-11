// src/app/blog/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          <h2 style={{ margin: 0 }}>오늘의 쇼핑 리뷰</h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => fetchPosts(null)}
              disabled={isLoading}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#F3F4F6',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              🔄
            </button>
            <Link 
              href="/write" 
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#3B82F6',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                textDecoration: 'none',
                fontWeight: '300',
                lineHeight: 1,
              }}
            >
              +
            </Link>
          </div>
        </div>

        <BannerAd slot={AD_SLOTS.TOP_BANNER} position="top" />

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

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="post-list">
          {(posts || []).map((post, index) => (
            <div key={post.slug}>
              <Link href={`/blog/${post.slug}`} className="post-card">
                {post.previewImage && (
                  <img
                    className="post-thumb"
                    src={post.previewImage}
                    alt={post.title}
                  />
                )}
                <div className="post-meta">
                  <h3>{post.title}</h3>
                  <p>{post.content?.replace(/!\[.*?\]\(.*?\)/g, '').slice(0, 100)}...</p>
                  <div className="post-footer">
                    <div className="post-tags">
                      {post.tags?.map((tag) => (
                        <span key={tag} className="post-tag">#{tag}</span>
                      ))}
                    </div>
                    <span>{post.author?.name} · {new Date(post.publishedAt).toLocaleDateString('ko-KR')}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                    👁 {post.viewCount} · ❤️ {post.likeCount}
                  </div>
                </div>
              </Link>
              
              {index === 2 && <InFeedAd slot={AD_SLOTS.IN_FEED} />}
              {index === 6 && <InFeedAd slot={AD_SLOTS.IN_FEED} />}
            </div>
          ))}

          {isLoading && (
            <div className="loading">
              <div className="loading-spinner"></div>
            </div>
          )}

          {!hasMore && (posts || []).length > 0 && (
            <>
              <BannerAd slot={AD_SLOTS.BOTTOM_BANNER} position="bottom" />
              <div style={{ padding: '20px', textAlign: 'center', color: '#9CA3AF' }}>
                모든 글을 불러왔습니다
              </div>
            </>
          )}

          {!isLoading && (posts || []).length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">📝</div>
              <p className="empty-text">아직 글이 없습니다. 첫 번째 글을 작성해보세요!</p>
              <Link href="/write" className="empty-btn">
                글 작성하기
              </Link>
            </div>
          )}

          <div ref={targetRef} style={{ height: '20px' }} />
        </div>
      </div>
    </>
  );
}
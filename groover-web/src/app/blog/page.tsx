// src/app/blog/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/layout/AppHeader';
import { BannerAd, InFeedAd } from '@/components/ad/AdBanner';
import { useFeed } from '@/hooks/useFeed';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

const categories = ['전체', '육아', '뷰티', '가전', '캠핑', '자취', '패션'];

// 광고 슬롯 ID (AdSense에서 광고 단위 생성 후 교체 필요)
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
        {/* 헤더 + 버튼들 */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '16px'
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
                background: '#f5f5f5',
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
                background: '#0f62fe',
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

        {/* 상단 광고 배너 */}
        <BannerAd slot={AD_SLOTS.TOP_BANNER} position="top" />

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
          <div style={{ padding: '20px', textAlign: 'center', color: '#e53e3e' }}>
            {error}
          </div>
        )}

        {/* 포스트 리스트 */}
        <div className="post-list">
          {(posts || []).map((post, index) => (
            <div key={post.id}>
              {/* slug 대신 id 사용 */}
              <Link href={`/blog/${post.id}`} className="post-card">
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
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    👁 {post.viewCount} · ❤️ {post.likeCount}
                  </div>
                </div>
              </Link>
              
              {/* 3번째 글 다음에 인피드 광고 */}
              {index === 2 && <InFeedAd slot={AD_SLOTS.IN_FEED} />}
              
              {/* 7번째 글 다음에 인피드 광고 */}
              {index === 6 && <InFeedAd slot={AD_SLOTS.IN_FEED} />}
            </div>
          ))}

          {/* 로딩 표시 */}
          {isLoading && (
            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
              로딩 중...
            </div>
          )}

          {/* 더 이상 없음 표시 */}
          {!hasMore && (posts || []).length > 0 && (
            <>
              <BannerAd slot={AD_SLOTS.BOTTOM_BANNER} position="bottom" />
              <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                모든 글을 불러왔습니다
              </div>
            </>
          )}

          {/* 글 없음 표시 */}
          {!isLoading && (posts || []).length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
              아직 글이 없습니다. 첫 번째 글을 작성해보세요!
            </div>
          )}

          {/* 무한스크롤 감지 영역 */}
          <div ref={targetRef} style={{ height: '20px' }} />
        </div>
      </div>
    </>
  );
}
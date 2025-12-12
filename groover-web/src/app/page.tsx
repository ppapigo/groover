// src/app/page.tsx
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/layout/AppHeader';
import { useFeed } from '@/hooks/useFeed';

const trendingTags = ['육아', '뷰티', '가전', '캠핑', '식품', '패션', '여행', '인테리어', '운동', '자동차'];

export default function HomePage() {
  const { posts, isLoading, fetchPosts } = useFeed({});

  useEffect(() => {
    fetchPosts(null);
  }, []);

  return (
    <>
      <AppHeader />
      <div className="home-page">
        <section className="hero-section">
          <h1>쇼핑 리뷰 커뮤니티</h1>
          <p>솔직한 리뷰와 추천을 공유하세요</p>
          <Link href="/write" className="cta-btn">
            글 쓰기
          </Link>
        </section>

        <section className="tags-section">
          <h2>지금 뜨는 태그</h2>
          <div className="tag-chips">
            {trendingTags.map((tag) => (
              <Link key={tag} href={`/blog?tag=${tag}`} className="tag-chip">
                #{tag}
              </Link>
            ))}
          </div>
        </section>

        <section className="feed-section">
          <div className="section-header">
            <h2>최신 리뷰</h2>
            <Link href="/blog" className="more-link">
              더 보기
            </Link>
          </div>

          {isLoading ? (
            <div className="loading">
              <div className="loading-spinner"></div>
            </div>
          ) : (
            <div className="post-grid">
              {(posts || []).slice(0, 6).map((post) => (
                <Link key={post.slug} href={`/blog/${post.slug}`} className="post-card">
                  <div className="post-thumb-wrapper">
                    {post.previewImage ? (
                      <img className="post-thumb" src={post.previewImage} alt={post.title} />
                    ) : (
                      <div className="post-thumb-placeholder">이미지 없음</div>
                    )}
                  </div>
                  <div className="post-info">
                    <h3>{post.title}</h3>
                    <div className="post-meta">
                      <span>{post.author?.name}</span>
                      <span>조회 {post.viewCount}</span>
                      <span>좋아요 {post.likeCount}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {!isLoading && (posts || []).length === 0 && (
            <div className="empty-state">
              <p>아직 글이 없습니다</p>
              <Link href="/write" className="empty-btn">
                첫 번째 글 작성하기
              </Link>
            </div>
          )}
        </section>
      </div>

      <style jsx>{`
        .home-page {
          padding-bottom: 80px;
        }
        .hero-section {
          text-align: center;
          padding: 40px 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .hero-section h1 {
          font-size: 24px;
          margin-bottom: 8px;
        }
        .hero-section p {
          font-size: 14px;
          opacity: 0.9;
          margin-bottom: 20px;
        }
        .cta-btn {
          display: inline-block;
          padding: 12px 24px;
          background: white;
          color: #667eea;
          border-radius: 25px;
          font-weight: 600;
          text-decoration: none;
        }
        .tags-section {
          padding: 20px;
        }
        .tags-section h2 {
          font-size: 16px;
          margin-bottom: 12px;
        }
        .tag-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .tag-chip {
          padding: 8px 14px;
          background: #f0f0f0;
          border-radius: 20px;
          font-size: 13px;
          color: #333;
          text-decoration: none;
          transition: all 0.2s;
        }
        .tag-chip:hover {
          background: #667eea;
          color: white;
        }
        .feed-section {
          padding: 20px;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .section-header h2 {
          font-size: 16px;
        }
        .more-link {
          font-size: 13px;
          color: #667eea;
          text-decoration: none;
        }
        .post-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        .post-card {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          text-decoration: none;
          color: inherit;
        }
        .post-thumb-wrapper {
          width: 100%;
          aspect-ratio: 4/3;
          overflow: hidden;
        }
        .post-thumb {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .post-thumb-placeholder {
          width: 100%;
          height: 100%;
          background: #f5f5f5;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          color: #999;
        }
        .post-info {
          padding: 12px;
        }
        .post-info h3 {
          font-size: 14px;
          margin-bottom: 8px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .post-meta {
          display: flex;
          gap: 8px;
          font-size: 11px;
          color: #888;
        }
        .loading {
          display: flex;
          justify-content: center;
          padding: 40px;
        }
        .loading-spinner {
          width: 30px;
          height: 30px;
          border: 3px solid #f0f0f0;
          border-top-color: #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #888;
        }
        .empty-btn {
          display: inline-block;
          margin-top: 12px;
          padding: 10px 20px;
          background: #667eea;
          color: white;
          border-radius: 20px;
          text-decoration: none;
        }
      `}</style>
    </>
  );
}
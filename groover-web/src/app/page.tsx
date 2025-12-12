// src/app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/layout/AppHeader';
import { useFeed } from '@/hooks/useFeed';

const trendingTags = ['육아', '뷰티', '가전', '캠핑', '식품', '패션', '반려동물', '인테리어', '운동', '자동차'];

export default function HomePage() {
  const { posts, isLoading, fetchPosts } = useFeed({});
  const [discussions] = useState([
    { id: 1, title: '요즘 공기청정기 뭐가 좋아요?', replies: 24, tag: '가전' },
    { id: 2, title: '캠핑 입문자 장비 추천', replies: 18, tag: '캠핑' },
    { id: 3, title: '아기 이유식 브랜드 추천해주세요', replies: 31, tag: '육아' },
  ]);

  useEffect(() => {
    fetchPosts(null);
  }, []);

  return (
    <>
      <AppHeader />
      <div className="home-page">
        {/* 히어로 섹션 */}
        <section className="hero-section">
          <h1>쇼핑 리뷰 커뮤니티</h1>
          <p>솔직한 리뷰와 추천을 공유하세요</p>
          <Link href="/write" className="cta-btn">
            ✏️ 글 쓰기
          </Link>
        </section>

        {/* 추천 태그 */}
        <section className="tags-section">
          <h2>🔥 지금 뜨는 태그</h2>
          <div className="tag-chips">
            {trendingTags.map((tag) => (
              <Link key={tag} href={`/blog?tag=${tag}`} className="tag-chip">
                #{tag}
              </Link>
            ))}
          </div>
        </section>

        {/* 블로그 피드 프리뷰 */}
        <section className="feed-section">
          <div className="section-header">
            <h2>📝 최신 리뷰</h2>
            <Link href="/blog" className="more-link">
              더 보기 →
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
                      <img
                        className="post-thumb"
                        src={post.previewImage}
                        alt={post.title}
                      />
                    ) : (
                      <div className="post-thumb-placeholder">📷</div>
                    )}
                  </div>
                  <div className="post-info">
                    <h3>{post.title}</h3>
                    <div className="post-meta">
                      <span>{post.author?.name}</span>
                      <span>👁 {post.viewCount}</span>
                      <span>❤️ {post.likeCount}</span>
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

        {/* 토론방 프리뷰 */}
        <section className="discussion-section">
          <div className="section-header">
            <h2>💬 지금 뜨는 토론</h2>
            <Link href="/discussions" className="more-link">
              토론방 가기 →
            </Link>
          </div>
          <div className="discussion-list">
            {discussions.map((d) => (
              <Link key={d.id} href={`/discussions/${d.id}`} className="discussion-card">
                <span className="discussion-tag">#{d.tag}</span>
                <h3>{d.title}</h3>
                <span className="discussion-replies">💬 {d.replies}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <style jsx>{`
        .home-page {
          padding-bottom: 80px;
        }

        /* 히어로 */
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

        /* 태그 섹션 */
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

        /* 피드 섹션 */
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
          font-size: 24px;
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

        /* 토론 섹션 */
        .discussion-section {
          padding: 20px;
          background: #f8f9fa;
        }
        .discussion-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .discussion-card {
          background: white;
          padding: 14px;
          border-radius: 10px;
          text-decoration: none;
          color: inherit;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .discussion-tag {
          font-size: 12px;
          color: #667eea;
          background: #f0f0ff;
          padding: 4px 8px;
          border-radius: 4px;
        }
        .discussion-card h3 {
          flex: 1;
          font-size: 14px;
          font-weight: 500;
        }
        .discussion-replies {
          font-size: 12px;
          color: #888;
        }

        /* 공통 */
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
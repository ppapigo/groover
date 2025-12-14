// src/app/page.tsx
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/layout/AppHeader';
import { useFeed } from '@/hooks/useFeed';
import { useAuth } from '@/hooks/useAuth';
import { Eye, Heart, PenLine, TrendingUp } from 'lucide-react';

const trendingTags = ['육아', '뷰티', '가전', '캠핑', '식품', '패션', '여행', '인테리어', '운동', '자동차'];

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { posts, isLoading, fetchPosts } = useFeed({});

  useEffect(() => {
    fetchPosts(null);
  }, []);

  const handleWriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (authLoading) return;
    
    if (!user) {
      if (confirm('글을 작성하려면 로그인이 필요합니다. 로그인하시겠습니까?')) {
        router.push('/login?redirect=/write');
      }
    } else {
      router.push('/write');
    }
  };

  // 인기글 정렬 (좋아요 + 조회수 기준)
  const popularPosts = [...(posts || [])]
    .sort((a, b) => (b.likeCount * 3 + b.viewCount) - (a.likeCount * 3 + a.viewCount))
    .slice(0, 5);

  // 시간 포맷팅
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  return (
    <>
      <AppHeader />
      <div className="home-page">
        <section className="hero-section">
          <h1>쇼핑 리뷰 커뮤니티</h1>
          <p>솔직한 리뷰와 추천을 공유하세요</p>
          <button onClick={handleWriteClick} className="cta-btn" disabled={authLoading}>
            <PenLine size={18} />
            글 쓰기
          </button>
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
            <h2>
              <TrendingUp size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              인기글
            </h2>
            <Link href="/blog" className="more-link">
              더 보기
            </Link>
          </div>

          {isLoading ? (
            <div className="loading">
              <div className="loading-spinner"></div>
            </div>
          ) : (
            <div className="popular-list">
              {popularPosts.map((post, index) => (
                <Link key={post.slug} href={`/blog/${post.slug}`} className="popular-item">
                  <span className="rank">{index + 1}</span>
                  <div className="popular-content">
                    <h3 className="popular-title">{post.title}</h3>
                    <div className="popular-meta">
                      <span className="author">{post.author?.name}</span>
                      <span className="dot">·</span>
                      <span className="time">{formatTime(post.publishedAt)}</span>
                      <span className="dot">·</span>
                      <span className="stat">
                        <Eye size={12} /> {post.viewCount}
                      </span>
                      {post.likeCount > 0 && (
                        <span className="stat like">
                          <Heart size={12} fill="#ff6f0f" /> {post.likeCount}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {!isLoading && (posts || []).length === 0 && (
            <div className="empty-state">
              <p>아직 글이 없습니다</p>
              <button onClick={handleWriteClick} className="empty-btn">
                첫 번째 글 작성하기
              </button>
            </div>
          )}
        </section>
      </div>

      <style jsx>{`
        .home-page {
          padding-bottom: 80px;
          max-width: 100vw;
          overflow-x: hidden;
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
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: white;
          color: #667eea;
          border-radius: 25px;
          font-weight: 600;
          text-decoration: none;
          border: none;
          cursor: pointer;
          font-size: 15px;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .cta-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        .cta-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
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
          display: flex;
          align-items: center;
        }
        .more-link {
          font-size: 13px;
          color: #667eea;
          text-decoration: none;
        }
        
        /* 인기글 리스트 스타일 */
        .popular-list {
          display: flex;
          flex-direction: column;
        }
        .popular-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 0;
          border-bottom: 1px solid #f0f0f0;
          text-decoration: none;
          color: inherit;
          transition: background 0.15s;
        }
        .popular-item:last-child {
          border-bottom: none;
        }
        .popular-item:active {
          background: #f9f9f9;
        }
        .rank {
          flex-shrink: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 700;
          color: #667eea;
        }
        .popular-content {
          flex: 1;
          min-width: 0;
        }
        .popular-title {
          font-size: 15px;
          font-weight: 600;
          color: #212121;
          margin-bottom: 6px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .popular-meta {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 4px;
          font-size: 12px;
          color: #999;
        }
        .author {
          color: #666;
        }
        .dot {
          color: #ddd;
        }
        .stat {
          display: flex;
          align-items: center;
          gap: 2px;
        }
        .stat.like {
          color: #ff6f0f;
          font-weight: 500;
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
          border: none;
          cursor: pointer;
          font-size: 14px;
        }
      `}</style>
    </>
  );
}
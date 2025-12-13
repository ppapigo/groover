// src/app/blog/page.tsx
'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import AppHeader from '@/components/layout/AppHeader';
import { useFeed } from '@/hooks/useFeed';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { Plus, Eye, Heart, Tag, X, Pin, PinOff, GripVertical, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface FeedTag {
  id: string;
  name: string;
  slug: string;
  postCount: number;
  iconEmoji?: string;
}

// 이미지 슬라이더 컴포넌트
function ImageSlider({ content, previewImage }: { content: string; previewImage?: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const startX = useRef(0);

  // 본문에서 이미지 URL 추출
  const extractImages = (text: string): string[] => {
    const images: string[] = [];
    if (previewImage) images.push(previewImage);
    
    const regex = /!\[.*?\]\((.*?)\)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (!images.includes(match[1])) {
        images.push(match[1]);
      }
    }
    return images.slice(0, 5); // 최대 5개
  };

  const images = extractImages(content || '');

  if (images.length === 0) {
    return (
      <div style={{
        width: '100%',
        aspectRatio: '4/3',
        background: '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '32px',
        borderRadius: '12px',
      }}>
        📝
      </div>
    );
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const endX = e.changedTouches[0].clientX;
    const diff = startX.current - endX;
    
    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentIndex < images.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else if (diff < 0 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          width: '100%',
          aspectRatio: '4/3',
          overflow: 'hidden',
          borderRadius: '12px',
        }}
      >
        <div
          style={{
            display: 'flex',
            transition: 'transform 0.3s ease',
            transform: `translateX(-${currentIndex * 100}%)`,
            height: '100%',
          }}
        >
          {images.map((img, idx) => (
            <img
              key={idx}
              src={img}
              alt={`이미지 ${idx + 1}`}
              style={{
                minWidth: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ))}
        </div>
      </div>
      
      {/* 인디케이터 */}
      {images.length > 1 && (
        <div style={{
          position: 'absolute',
          bottom: '8px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '6px',
        }}>
          {images.map((_, idx) => (
            <div
              key={idx}
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: currentIndex === idx ? '#fff' : 'rgba(255,255,255,0.5)',
                transition: 'background 0.2s',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BlogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tagFromUrl = searchParams.get('tag');
  const { user } = useAuth();
  
  const [activeTag, setActiveTag] = useState<string | null>(tagFromUrl);
  const [popularTags, setPopularTags] = useState<FeedTag[]>([]);
  const [pinnedTags, setPinnedTags] = useState<FeedTag[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(true);
  const [showTagManager, setShowTagManager] = useState(false);
  const [draggedTag, setDraggedTag] = useState<string | null>(null);
  
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

  // 인기 태그 & 핀한 태그 불러오기
  useEffect(() => {
    const fetchTags = async () => {
      try {
        // 인기 태그
        const popularRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/v1'}/tags/feed/popular?limit=20`
        );
        const popularData = await popularRes.json();
        if (popularData.success && popularData.data) {
          setPopularTags(popularData.data);
        }

        // 로그인한 경우 핀한 태그도 불러오기
        if (user) {
          const token = localStorage.getItem('accessToken');
          const pinnedRes = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/v1'}/tags/pinned`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const pinnedData = await pinnedRes.json();
          if (pinnedData.success && pinnedData.data) {
            setPinnedTags(pinnedData.data);
          }
        }
      } catch (err) {
        console.error('태그 로딩 실패:', err);
      } finally {
        setIsLoadingTags(false);
      }
    };

    fetchTags();
  }, [user]);

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

  // 태그 핀/언핀
  const handlePinTag = async (tag: FeedTag) => {
    if (!user) {
      if (confirm('태그를 핀하려면 로그인이 필요합니다. 로그인하시겠습니까?')) {
        router.push('/login?redirect=/blog');
      }
      return;
    }

    const token = localStorage.getItem('accessToken');
    const isPinned = pinnedTags.some(t => t.id === tag.id);

    try {
      if (isPinned) {
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/v1'}/tags/pinned/${tag.id}`,
          { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
        );
        setPinnedTags(pinnedTags.filter(t => t.id !== tag.id));
      } else {
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/v1'}/tags/pinned/${tag.id}`,
          { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
        );
        setPinnedTags([...pinnedTags, tag]);
      }
    } catch (err) {
      console.error('태그 핀 실패:', err);
    }
  };

  // 태그 순서 변경
  const handleReorderTags = async (fromIndex: number, toIndex: number) => {
    const newPinnedTags = [...pinnedTags];
    const [movedTag] = newPinnedTags.splice(fromIndex, 1);
    newPinnedTags.splice(toIndex, 0, movedTag);
    setPinnedTags(newPinnedTags);

    if (user) {
      const token = localStorage.getItem('accessToken');
      try {
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/v1'}/tags/pinned/reorder`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ tagIds: newPinnedTags.map(t => t.id) }),
          }
        );
      } catch (err) {
        console.error('태그 순서 변경 실패:', err);
      }
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
    if (containerRef.current?.scrollTop === 0 && !showTagManager) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, [showTagManager]);

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

  // 표시할 태그 (핀한 태그 우선, 없으면 인기 태그)
  const displayTags = pinnedTags.length > 0 ? pinnedTags : popularTags.slice(0, 10);

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

        {/* 태그 관리 패널 */}
        {showTagManager && (
          <div style={{
            background: '#f9f9f9',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px',
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '12px',
            }}>
              <span style={{ fontWeight: '600', fontSize: '14px' }}>
                내 관심 태그 관리
              </span>
              <button 
                onClick={() => setShowTagManager(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            
            {/* 핀한 태그 */}
            {pinnedTags.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                  핀한 태그 (드래그로 순서 변경)
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {pinnedTags.map((tag, index) => (
                    <div
                      key={tag.id}
                      draggable
                      onDragStart={() => setDraggedTag(tag.id)}
                      onDragEnd={() => setDraggedTag(null)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (draggedTag) {
                          const fromIndex = pinnedTags.findIndex(t => t.id === draggedTag);
                          handleReorderTags(fromIndex, index);
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '6px 12px',
                        background: '#e8f4ff',
                        borderRadius: '20px',
                        fontSize: '13px',
                        color: '#0f62fe',
                        cursor: 'grab',
                        opacity: draggedTag === tag.id ? 0.5 : 1,
                      }}
                    >
                      <GripVertical size={14} />
                      #{tag.name}
                      <button
                        onClick={() => handlePinTag(tag)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'flex',
                        }}
                      >
                        <PinOff size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* 인기 태그에서 핀하기 */}
            <div>
              <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                인기 태그 (탭해서 핀하기)
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {popularTags.filter(t => !pinnedTags.some(p => p.id === t.id)).map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => handlePinTag(tag)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 12px',
                      background: '#f0f0f0',
                      borderRadius: '20px',
                      fontSize: '13px',
                      color: '#333',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <Pin size={12} />
                    #{tag.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 태그 칩 */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: '12px',
            paddingLeft: '4px',
          }}>
            <button 
              onClick={() => setShowTagManager(!showTagManager)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '8px',
              }}
            >
              <Tag size={16} style={{ color: '#666' }} />
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
                {pinnedTags.length > 0 ? '내 관심 태그' : '인기 태그'}
              </span>
              <Settings size={14} style={{ color: '#999' }} />
            </button>
          </div>
          
          <div 
            style={{
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
              paddingBottom: '8px',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <button
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
            
            {!isLoadingTags && displayTags.map((tag) => (
              <button
                key={tag.id}
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

        {/* 포스트 리스트 - 새로운 레이아웃 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {(posts || []).map((post) => (
            <div 
              key={post.slug} 
              style={{
                background: '#fff',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
              }}
            >
              {/* 상단: 작성자 정보 */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '14px 16px',
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                }}>
                  {post.author?.name?.charAt(0) || '?'}
                </div>
                <div>
                  <p style={{ fontWeight: '600', fontSize: '14px' }}>{post.author?.name}</p>
                  <p style={{ fontSize: '12px', color: '#888' }}>
                    {new Date(post.publishedAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
              </div>

              {/* 제목 */}
              <Link href={`/blog/${post.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <h3 style={{
                  padding: '0 16px',
                  fontSize: '17px',
                  fontWeight: '700',
                  lineHeight: 1.4,
                  marginBottom: '8px',
                }}>
                  {post.title}
                </h3>
              </Link>

              {/* 본문 미리보기 */}
              <Link href={`/blog/${post.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <p style={{
                  padding: '0 16px',
                  fontSize: '14px',
                  color: '#666',
                  lineHeight: 1.6,
                  marginBottom: '12px',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {post.content?.replace(/!\[.*?\]\(.*?\)/g, '').replace(/[#*`]/g, '').slice(0, 100)}
                </p>
              </Link>

              {/* 이미지 슬라이더 */}
              <div style={{ padding: '0 16px' }}>
                <Link href={`/blog/${post.slug}`} style={{ display: 'block' }}>
                  <ImageSlider content={post.content} previewImage={post.previewImage} />
                </Link>
              </div>

              {/* 하단: 좋아요, 조회수 */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '14px 16px',
                borderTop: '1px solid #f0f0f0',
                marginTop: '12px',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#666', fontSize: '14px' }}>
                  <Heart size={18} /> {post.likeCount}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#666', fontSize: '14px' }}>
                  <Eye size={18} /> {post.viewCount}
                </span>
              </div>
            </div>
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
// src/app/blog/page.tsx
'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import AppHeader from '@/components/layout/AppHeader';
import { useFeed } from '@/hooks/useFeed';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { Plus, Eye, Heart, Tag, X, Pin, PinOff, GripVertical, Settings, MessageCircle, MoreVertical, Pencil, Trash2, Flag } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface FeedTag {
  id: string;
  name: string;
  slug: string;
  postCount: number;
  iconEmoji?: string;
}

// 썸네일 이미지 추출 함수
function extractThumbnail(content: string, previewImage?: string): string | null {
  if (previewImage) return previewImage;
  
  if (!content) return null;
  
  const regex = /!\[.*?\]\((.*?)\)/;
  const match = regex.exec(content);
  return match ? match[1] : null;
}

// 구매 상태 색상
function getStatusStyle(status: string) {
  switch (status) {
    case '구매함': return { bg: '#e8f5e9', color: '#2e7d32' };
    case '고민중': return { bg: '#fff3e0', color: '#ef6c00' };
    case '비추천': return { bg: '#ffebee', color: '#c62828' };
    default: return { bg: '#f5f5f5', color: '#666' };
  }
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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  
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

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const popularRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/v1'}/tags/feed/popular?limit=20`
        );
        const popularData = await popularRes.json();
        if (popularData.success && popularData.data) {
          setPopularTags(popularData.data);
        }

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

  useEffect(() => {
    setActiveTag(tagFromUrl);
  }, [tagFromUrl]);

  useEffect(() => {
    fetchPosts(null);
  }, [activeTag]);

  useEffect(() => {
    const handleClickOutside = () => {
      if (openMenuId) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openMenuId]);

  const handleTagSelect = (tag: string | null) => {
    if (tag) {
      router.push(`/blog?tag=${encodeURIComponent(tag)}`);
    } else {
      router.push('/blog');
    }
  };

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

  const handleMenuToggle = (e: React.MouseEvent, postSlug: string) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenMenuId(openMenuId === postSlug ? null : postSlug);
  };

  const handleEdit = (e: React.MouseEvent, postSlug: string) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenMenuId(null);
    router.push(`/write?edit=${postSlug}`);
  };

  const handleDelete = async (e: React.MouseEvent, postSlug: string) => {
  e.preventDefault();
  e.stopPropagation();
  setOpenMenuId(null);
  
  if (!confirm('정말 이 글을 삭제하시겠습니까?')) return;
  
  try {
    const token = localStorage.getItem('accessToken');
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/v1'}/blog/posts/${postSlug}`,
      { 
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    if (res.ok) {
      fetchPosts(null);
    } else {
      alert('삭제에 실패했습니다.');
    }
  } catch (err) {
    alert('삭제 중 오류가 발생했습니다.');
  }
};

  const handleReport = (e: React.MouseEvent, postSlug: string) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenMenuId(null);
    
    if (!user) {
      if (confirm('신고하려면 로그인이 필요합니다. 로그인하시겠습니까?')) {
        router.push('/login?redirect=/blog');
      }
      return;
    }
    
    if (confirm('이 글을 신고하시겠습니까?')) {
      alert('신고가 접수되었습니다.');
    }
  };

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

  const displayTags = pinnedTags.length > 0 ? pinnedTags : popularTags.slice(0, 10);

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
        {/* Pull to refresh */}
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

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* 포스트 리스트 */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {(posts || []).map((post) => {
            const thumbnail = extractThumbnail(post.content, post.previewImage);
            const isAuthor = user && post.author?.id === user.id;
            
            // 메타데이터에서 핵심 요약 가져오기
            const metadata = post.metadata || {};
            const summary = metadata.summary || '';
            const purchaseStatus = metadata.purchaseStatus || '';
            const priceRange = metadata.priceRange || '';
            
            return (
              <article 
                key={post.slug}
                style={{
                  padding: '16px 0',
                  borderBottom: '1px solid #f0f0f0',
                }}
              >
                {/* 상단: 썸네일 + 제목 + 메뉴 */}
                <div style={{ 
                  display: 'flex',
                  gap: '12px',
                  marginBottom: '10px',
                }}>
                  {/* 썸네일 */}
                  {thumbnail && (
                    <Link href={`/blog/${post.slug}`} style={{ flexShrink: 0 }}>
                      <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        background: '#f5f5f5',
                        position: 'relative',
                      }}>
                        <img 
                          src={thumbnail}
                          alt=""
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                        {/* 구매 상태 배지 */}
                        {purchaseStatus && (
                          <span style={{
                            position: 'absolute',
                            top: '4px',
                            left: '4px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '600',
                            background: getStatusStyle(purchaseStatus).bg,
                            color: getStatusStyle(purchaseStatus).color,
                          }}>
                            {purchaseStatus}
                          </span>
                        )}
                      </div>
                    </Link>
                  )}
                  
                  {/* 제목 + 요약 */}
                  <Link 
                    href={`/blog/${post.slug}`}
                    style={{ 
                      flex: 1, 
                      minWidth: 0,
                      textDecoration: 'none',
                      color: 'inherit',
                    }}
                  >
                    {/* 구매상태 (이미지 없을 때) */}
                    {!thumbnail && purchaseStatus && (
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600',
                        marginBottom: '6px',
                        background: getStatusStyle(purchaseStatus).bg,
                        color: getStatusStyle(purchaseStatus).color,
                      }}>
                        {purchaseStatus}
                      </span>
                    )}
                    
                    <h3 style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      lineHeight: 1.4,
                      marginBottom: '6px',
                      color: '#212121',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {post.title}
                    </h3>
                    
                    {/* 핵심 한 줄 요약 (본문 미리보기 대신) */}
                    {summary ? (
                      <p style={{
                        fontSize: '14px',
                        color: '#0f62fe',
                        lineHeight: 1.5,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        💬 {summary}
                      </p>
                    ) : (
                      <p style={{
                        fontSize: '14px',
                        color: '#666',
                        lineHeight: 1.5,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {priceRange && `💰 ${priceRange}`}
                      </p>
                    )}
                  </Link>
                  
                  {/* 더보기 메뉴 */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <button
                      onClick={(e) => handleMenuToggle(e, post.slug)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#999',
                      }}
                    >
                      <MoreVertical size={20} />
                    </button>
                    
                    {openMenuId === post.slug && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          right: 0,
                          background: '#fff',
                          borderRadius: '12px',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                          overflow: 'hidden',
                          zIndex: 100,
                          minWidth: '120px',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isAuthor && (
                          <>
                            <button
                              onClick={(e) => handleEdit(e, post.slug)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                width: '100%',
                                padding: '12px 16px',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '14px',
                                color: '#333',
                                textAlign: 'left',
                              }}
                            >
                              <Pencil size={16} />
                              수정
                            </button>
                            <button
                              onClick={(e) => handleDelete(e, post.slug)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                width: '100%',
                                padding: '12px 16px',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '14px',
                                color: '#ff4444',
                                textAlign: 'left',
                              }}
                            >
                              <Trash2 size={16} />
                              삭제
                            </button>
                          </>
                        )}
                        <button
                          onClick={(e) => handleReport(e, post.slug)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            width: '100%',
                            padding: '12px 16px',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '14px',
                            color: '#666',
                            textAlign: 'left',
                          }}
                        >
                          <Flag size={16} />
                          신고
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* 하단: 메타 정보 - 우측 정렬 */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '6px',
                  fontSize: '13px',
                  color: '#999',
                }}>
                  <span style={{ color: '#666' }}>{post.author?.name}</span>
                  <span>·</span>
                  <span>{formatTime(post.publishedAt)}</span>
                  <span>·</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <Eye size={14} /> {post.viewCount}
                  </span>
                  
                  {post.commentCount > 0 && (
                    <>
                      <span>·</span>
                      <span style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '2px',
                      }}>
                        <MessageCircle size={14} /> {post.commentCount}
                      </span>
                    </>
                  )}
                  
                  {post.likeCount > 0 && (
                    <>
                      <span>·</span>
                      <span style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '3px',
                        color: '#ff6f0f',
                        fontWeight: '500',
                      }}>
                        <Heart size={14} fill="#ff6f0f" /> {post.likeCount}
                      </span>
                    </>
                  )}
                </div>
              </article>
            );
          })}

          {isLoading && (
            <div className="loading">
              <div className="loading-spinner"></div>
            </div>
          )}

          {!hasMore && (posts || []).length > 0 && (
            <div className="end-message">
              모든 글을 불러왔습니다
            </div>
          )}

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

        {/* 플로팅 글쓰기 버튼 */}
        <button
          onClick={handleWriteClick}
          style={{
            position: 'fixed',
            bottom: '80px',
            right: '20px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: '#0f62fe',
            border: 'none',
            boxShadow: '0 4px 12px rgba(15, 98, 254, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'transform 0.2s, box-shadow 0.2s',
            zIndex: 100,
          }}
        >
          <Plus size={28} color="#fff" />
        </button>
      </div>

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
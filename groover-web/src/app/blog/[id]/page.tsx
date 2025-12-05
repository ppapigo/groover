// src/app/blog/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppHeader from '@/components/layout/AppHeader';
import CommentSection from '@/components/blog/CommentSection';
import { MockAdBanner } from '@/components/ad/AdBanner';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

interface Post {
  id: string;
  title: string;
  content: string;
  previewImage: string | null;
  tags: string[];
  slug: string;
  viewCount: number;
  likeCount: number;
  shareCount?: number;
  isLiked?: boolean;
  isOwner?: boolean;
  author: {
    id: string;
    name: string;
  };
  publishedAt: string;
  hasAffiliateLinks: boolean;
}

interface Product {
  id: string;
  name: string;
  image: string | null;
  price: number | null;
  source: string;
  clickUrl: string;
}

export default function BlogDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    fetchPost();
  }, [params.id]);

  const fetchPost = async () => {
    try {
      const res = await api.get(`/blog/posts/${params.id}`);
      const postData = res.data.data;
      setPost(postData);
      setIsLiked(postData.isLiked || false);
      setLikeCount(postData.likeCount || 0);

      // 상품 정보 가져오기
      try {
        const productsRes = await api.get(`/blog/posts/${postData.id}/products`);
        setProducts(productsRes.data.data || []);
      } catch (err) {
        // 상품 없으면 무시
      }
    } catch (err) {
      alert('글을 찾을 수 없습니다.');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const handleLike = async () => {
    if (!isAuthenticated) {
      if (confirm('로그인이 필요합니다. 로그인하시겠습니까?')) {
        router.push('/login');
      }
      return;
    }

    try {
      const res = await api.post(`/blog/posts/${post?.id}/like`);
      setIsLiked(res.data.data.liked);
      setLikeCount(prev => res.data.data.liked ? prev + 1 : prev - 1);
    } catch (err) {
      alert('좋아요 처리에 실패했습니다.');
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    
    // 공유 카운트 기록
    try {
      await api.post(`/blog/posts/${post?.id}/share?platform=link`);
    } catch (err) {
      // 무시
    }

    // Web Share API
    if (navigator.share) {
      try {
        await navigator.share({
          title: post?.title,
          url: url,
        });
      } catch (err) {
        // 취소됨
      }
    } else {
      // 클립보드 복사
      await navigator.clipboard.writeText(url);
      alert('링크가 복사되었습니다!');
    }
  };

  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      await api.delete(`/blog/posts/${post?.id}`);
      alert('삭제되었습니다.');
      router.push('/blog');
    } catch (err) {
      alert('삭제에 실패했습니다.');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <>
        <AppHeader />
        <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
          로딩 중...
        </div>
      </>
    );
  }

  if (!post) {
    return (
      <>
        <AppHeader />
        <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
          글을 찾을 수 없습니다.
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader />
      <article>
        {/* 이미지 */}
        {post.previewImage && (
          <div style={{ padding: '0 16px' }}>
            <img
              src={post.previewImage}
              alt={post.title}
              style={{
                width: '100%',
                height: '200px',
                objectFit: 'cover',
                borderRadius: '12px',
                marginBottom: '16px',
              }}
            />
          </div>
        )}

        <div style={{ padding: '0 16px' }}>
          {/* 태그 */}
          {post.tags && post.tags.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
              {post.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/blog?tag=${tag}`}
                  style={{
                    fontSize: '12px',
                    color: '#0f62fe',
                    background: '#e8f0fe',
                    padding: '4px 10px',
                    borderRadius: '999px',
                    textDecoration: 'none',
                  }}
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}

          {/* 제목 + 메뉴 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h1 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px', flex: 1 }}>
              {post.title}
            </h1>
            {post.isOwner && (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '20px',
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                >
                  ⋮
                </button>
                {showMenu && (
                  <div style={{
                    position: 'absolute',
                    right: 0,
                    top: '100%',
                    background: '#fff',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    zIndex: 10,
                  }}>
                    <Link
                      href={`/write?edit=${post.id}`}
                      style={{
                        display: 'block',
                        padding: '12px 20px',
                        fontSize: '14px',
                        color: '#333',
                        textDecoration: 'none',
                        borderBottom: '1px solid #eee',
                      }}
                    >
                      수정
                    </Link>
                    <button
                      onClick={handleDelete}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '12px 20px',
                        fontSize: '14px',
                        color: '#ef4444',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      삭제
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 작성자 정보 */}
          <div style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>
            <Link 
              href={`/profile/${post.author.id}`}
              style={{ color: '#333', fontWeight: '500', textDecoration: 'none' }}
            >
              {post.author.name}
            </Link>
            {' · '}
            {formatDate(post.publishedAt)}
            {' · '}
            조회 {post.viewCount}
          </div>

          {/* 본문 */}
          <div
            style={{
              fontSize: '15px',
              lineHeight: '1.8',
              whiteSpace: 'pre-wrap',
              marginBottom: '24px',
            }}
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* 중간 광고 배너 */}
          <MockAdBanner position="middle" />

          {/* 관련 상품 */}
          {products.length > 0 && (
            <>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', marginTop: '24px' }}>
                📦 관련 상품
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {products.map((product) => (
                  <a
                    key={product.id}
                    href={product.clickUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px',
                      background: '#f8f9fa',
                      borderRadius: '10px',
                      textDecoration: 'none',
                      color: 'inherit',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {product.image && (
                        <img
                          src={product.image}
                          alt={product.name}
                          style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '8px' }}
                        />
                      )}
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: '500' }}>{product.name}</p>
                        <p style={{ fontSize: '12px', color: '#666' }}>{product.source}</p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {product.price && (
                        <p style={{ fontSize: '14px', fontWeight: '700' }}>
                          {product.price.toLocaleString()}원
                        </p>
                      )}
                      <span
                        style={{
                          display: 'inline-block',
                          marginTop: '4px',
                          padding: '4px 12px',
                          fontSize: '12px',
                          background: '#0f62fe',
                          color: '#fff',
                          borderRadius: '6px',
                        }}
                      >
                        구매
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </>
          )}

          {/* 하단 액션 */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '16px',
              marginTop: '24px',
              paddingTop: '16px',
              borderTop: '1px solid #eee',
            }}
          >
            <button
              onClick={handleLike}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '8px 16px',
                background: isLiked ? '#fee2e2' : 'transparent',
                border: `1px solid ${isLiked ? '#ef4444' : '#ddd'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                color: isLiked ? '#ef4444' : 'inherit',
              }}
            >
              {isLiked ? '❤️' : '🤍'} {likeCount}
            </button>
            <button
              onClick={handleShare}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '8px 16px',
                background: 'transparent',
                border: '1px solid #ddd',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              🔗 공유
            </button>
          </div>

          {post.hasAffiliateLinks && (
            <p style={{ marginTop: '16px', fontSize: '11px', color: '#999', textAlign: 'center' }}>
              이 포스팅은 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 작성자가 제공받습니다.
            </p>
          )}
        </div>

        {/* 하단 광고 배너 */}
        <div style={{ padding: '0 16px 16px' }}>
          <MockAdBanner position="bottom" />
        </div>

        {/* 댓글 섹션 */}
        <CommentSection postId={post.id} />
      </article>
    </>
  );
}
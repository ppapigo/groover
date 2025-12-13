// src/app/search/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/layout/AppHeader';
import { Search, Eye, Heart, Flame } from 'lucide-react';

interface SearchResult {
  id: string;
  title: string;
  excerpt: string;
  previewImage: string | null;
  slug: string;
  author: {
    id: string;
    name: string;
  };
  viewCount: number;
  likeCount: number;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const debounce = setTimeout(() => {
      handleSearch();
    }, 300);

    return () => clearTimeout(debounce);
  }, [query]);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/v1'}/search?q=${encodeURIComponent(query.trim())}`
      );
      const data = await res.json();
      if (data.posts) {
        setResults(data.posts);
      } else if (data.data?.posts) {
        setResults(data.data.posts);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error('검색 실패:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AppHeader />
      <div className="search-page">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Search size={24} className="text-primary" />
          <h2 style={{ margin: 0 }}>검색</h2>
        </div>
        <p>상품명이나 리뷰 키워드를 검색해보세요</p>

        <div className="search-input-wrapper">
          <input
            type="text"
            className="search-input"
            placeholder="예: 겨울 캠핑 텐트, 육아용품 추천..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* 로딩 */}
        {isLoading && (
          <div style={{ marginTop: '24px', textAlign: 'center', color: '#666' }}>
            검색 중...
          </div>
        )}

        {/* 검색 결과 */}
        {!isLoading && query && results.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
              "{query}" 검색 결과 {results.length}건
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {results.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  style={{
                    display: 'flex',
                    background: '#fff',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    textDecoration: 'none',
                    color: 'inherit',
                    border: '1px solid #eee',
                  }}
                >
                  {post.previewImage && (
                    <img
                      src={post.previewImage}
                      alt={post.title}
                      style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                    />
                  )}
                  <div style={{ padding: '12px', flex: 1 }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>
                      {post.title}
                    </h3>
                    <p style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
                      {post.excerpt?.slice(0, 50)}...
                    </p>
                    <div style={{ fontSize: '12px', color: '#999', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{post.author?.name}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <Eye size={12} /> {post.viewCount}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <Heart size={12} /> {post.likeCount}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 검색 결과 없음 */}
        {!isLoading && query && results.length === 0 && (
          <div style={{ marginTop: '24px', textAlign: 'center', color: '#999' }}>
            "{query}"에 대한 검색 결과가 없습니다.
          </div>
        )}

        {/* 인기 검색어 */}
        {!query && (
          <div style={{ marginTop: '32px', textAlign: 'left' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Flame size={16} className="text-orange-500" />
              인기 검색어
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {['캠핑', '육아', '다이슨', '자취템', '가성비', '겨울옷'].map((keyword) => (
                <button
                  key={keyword}
                  onClick={() => setQuery(keyword)}
                  style={{
                    padding: '8px 14px',
                    fontSize: '13px',
                    background: '#f5f5f5',
                    border: 'none',
                    borderRadius: '999px',
                    cursor: 'pointer',
                  }}
                >
                  {keyword}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
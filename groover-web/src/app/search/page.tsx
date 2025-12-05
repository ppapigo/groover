// src/app/search/page.tsx
'use client';

import { useState } from 'react';
import AppHeader from '@/components/layout/AppHeader';

export default function SearchPage() {
  const [query, setQuery] = useState('');

  return (
    <>
      <AppHeader />
      <div className="search-page">
        <h2>🔍 검색</h2>
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

        {query && (
          <div style={{ marginTop: '24px', textAlign: 'left' }}>
            <p style={{ fontSize: '14px', color: '#666' }}>
              "{query}" 검색 결과가 여기에 표시됩니다.
            </p>
          </div>
        )}

        {/* 인기 검색어 */}
        <div style={{ marginTop: '32px', textAlign: 'left' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
            🔥 인기 검색어
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
      </div>
    </>
  );
}

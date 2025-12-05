// src/app/blog/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/layout/AppHeader';
import { MockAdBanner } from '@/components/ad/AdBanner';

interface Post {
  id: string;
  title: string;
  desc: string;
  date: string;
  author: string;
  tags: string[];
  imageUrl: string;
  likes: number;
  views: number;
}

const posts: Post[] = [
  {
    id: '1',
    title: '육아템 총정리! 신생아부터 돌까지 필수 아이템 20가지',
    desc: '첫째 키우면서 진짜 유용했던 육아템들만 정리했어요. 쓸데없는 거 사지 마시고 이것만 사세요!',
    date: '2024. 12. 01.',
    author: '육아맘',
    tags: ['육아', '신생아'],
    imageUrl: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=300',
    likes: 234,
    views: 1520,
  },
  {
    id: '2',
    title: '겨울 캠핑 장바구니 - 따뜻하게 캠핑하기',
    desc: '추운 겨울에도 캠핑 가능! 난방 텐트부터 핫팩까지 완벽 준비 리스트',
    date: '2024. 11. 28.',
    author: '캠핑러버',
    tags: ['캠핑', '겨울'],
    imageUrl: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=300',
    likes: 89,
    views: 456,
  },
  {
    id: '3',
    title: '다이슨 에어랩 vs 샤오미 드라이기 솔직 비교 후기',
    desc: '비싼 게 다가 아니더라고요. 6개월 사용 후 솔직한 비교 리뷰입니다.',
    date: '2024. 11. 25.',
    author: '뷰티덕후',
    tags: ['뷰티', '가전'],
    imageUrl: 'https://images.unsplash.com/photo-1522338242042-2d1c2985df9f?w=300',
    likes: 567,
    views: 3240,
  },
  {
    id: '4',
    title: '자취 필수템 추천! 원룸 살림 시작하는 분들 필독',
    desc: '처음 자취 시작할 때 이거 없으면 진짜 불편해요. 가성비 좋은 것들만 모았습니다.',
    date: '2024. 11. 20.',
    author: '자취9년차',
    tags: ['자취', '살림'],
    imageUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=300',
    likes: 892,
    views: 5670,
  },
];

const categories = ['전체', '육아', '뷰티', '가전', '캠핑', '자취', '패션'];

export default function BlogPage() {
  const [activeCategory, setActiveCategory] = useState('전체');

  const filteredPosts = activeCategory === '전체'
    ? posts
    : posts.filter((p) => p.tags.some((t) => t.includes(activeCategory)));

  return (
    <>
      <AppHeader />
      <div className="blog-page">
        {/* 헤더 + 글쓰기 버튼 */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h2 style={{ margin: 0 }}>오늘의 쇼핑 리뷰</h2>
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

        {/* 상단 광고 배너 */}
        <MockAdBanner position="top" />

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

        {/* 포스트 리스트 */}
        <div className="post-list">
          {filteredPosts.map((post, index) => (
            <div key={post.id}>
              <Link href={`/blog/${post.id}`} className="post-card">
                <img
                  className="post-thumb"
                  src={post.imageUrl}
                  alt={post.title}
                />
                <div className="post-meta">
                  <h3>{post.title}</h3>
                  <p>{post.desc}</p>
                  <div className="post-footer">
                    <div className="post-tags">
                      {post.tags.map((tag) => (
                        <span key={tag} className="post-tag">#{tag}</span>
                      ))}
                    </div>
                    <span>{post.author} · {post.date}</span>
                  </div>
                </div>
              </Link>
              
              {/* 2번째 글 다음에 중간 광고 */}
              {index === 1 && <MockAdBanner position="middle" />}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
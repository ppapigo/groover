// src/app/blog/[id]/page.tsx
'use client';

import AppHeader from '@/components/layout/AppHeader';
import CommentSection from '@/components/blog/CommentSection';
import { MockAdBanner } from '@/components/ad/AdBanner';

// Mock 데이터
const post = {
  id: '1',
  title: '육아템 총정리! 신생아부터 돌까지 필수 아이템 20가지',
  content: `안녕하세요! 두 아이 엄마입니다.

첫째 키울 때 정말 많은 시행착오를 겪었어요. 필요 없는 것도 많이 사고, 정작 필요한 건 나중에 허겁지겁 사고...

그래서 둘째 준비하면서 정리한 진짜 필수템만 공유합니다!

🍼 수유용품
1. 젖병 소독기 - 진짜 필수예요
2. 분유포트 - 70도 유지 기능 추천
3. 수유쿠션 - 팔 안 아프려면 꼭 필요

🛒 위생용품
4. 기저귀 - 하루 10장 이상 써요
5. 물티슈 - 무향, 무알콜로!
6. 기저귀 크림 - 엉덩이 트러블 예방

🛏️ 수면용품
7. 아기 침대 - 허리 나가요...
8. 속싸개 - 모로반사 잡아줘요
9. 백색소음기 - 잠투정에 효과 짱!`,
  author: '육아맘',
  date: '2024. 12. 01.',
  tags: ['육아', '신생아', '육아템'],
  imageUrl: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=800',
  likes: 234,
  views: 1520,
};

const products = [
  { id: '1', name: '필립스 아벤트 젖병 소독기', price: 89000, store: '쿠팡' },
  { id: '2', name: '브라운 분유포트', price: 45000, store: '네이버' },
  { id: '3', name: '에르고베이비 수유쿠션', price: 68000, store: '쿠팡' },
];

export default function BlogDetailPage({ params }: { params: { id: string } }) {
  return (
    <>
      <AppHeader />
      <article>
        {/* 이미지 */}
        <div style={{ padding: '0 16px' }}>
          <img
            src={post.imageUrl}
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

        <div style={{ padding: '0 16px' }}>
          {/* 태그 */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
            {post.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: '12px',
                  color: '#0f62fe',
                  background: '#e8f0fe',
                  padding: '4px 10px',
                  borderRadius: '999px',
                }}
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* 제목 */}
          <h1 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>
            {post.title}
          </h1>

          {/* 작성자 정보 */}
          <div style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>
            {post.author} · {post.date} · 조회 {post.views}
          </div>

          {/* 본문 */}
          <div
            style={{
              fontSize: '14px',
              lineHeight: '1.8',
              whiteSpace: 'pre-wrap',
              marginBottom: '24px',
            }}
          >
            {post.content}
          </div>

          {/* 중간 광고 배너 */}
          <MockAdBanner position="middle" />

          {/* 관련 상품 */}
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', marginTop: '24px' }}>
            📦 관련 상품
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {products.map((product) => (
              <div
                key={product.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px',
                  background: '#f8f9fa',
                  borderRadius: '10px',
                }}
              >
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '500' }}>{product.name}</p>
                  <p style={{ fontSize: '12px', color: '#666' }}>{product.store}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '14px', fontWeight: '700' }}>
                    {product.price.toLocaleString()}원
                  </p>
                  <button
                    style={{
                      marginTop: '4px',
                      padding: '4px 12px',
                      fontSize: '12px',
                      background: '#0f62fe',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    구매
                  </button>
                </div>
              </div>
            ))}
          </div>

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
              ❤️ {post.likes}
            </button>
            <button
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

          <p style={{ marginTop: '16px', fontSize: '11px', color: '#999', textAlign: 'center' }}>
            이 포스팅은 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 작성자가 제공받습니다.
          </p>
        </div>

        {/* 하단 광고 배너 */}
        <div style={{ padding: '0 16px 16px' }}>
          <MockAdBanner position="bottom" />
        </div>

        {/* 댓글 섹션 */}
        <CommentSection postId={params.id} />
      </article>
    </>
  );
}

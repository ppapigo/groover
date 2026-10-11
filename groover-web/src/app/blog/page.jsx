'use client';
import { Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { SlidersHorizontal, PenLine } from 'lucide-react';
import AppHeader from '@/components/layout/AppHeader';
import ReviewCard from '@/components/review/ReviewCard';
import { useFeed } from '@/hooks/useFeed';
const categories = ['전체', '디지털', '생활가전', '뷰티', '패션', '주방', '취미'];
function Reviews() {
    const params = useSearchParams();
    const tag = params.get('tag');
    const { posts, isLoading, error, hasMore, fetchPosts, loadMore } = useFeed({ tag: tag || undefined, limit: 12 });
    useEffect(() => { fetchPosts(null); }, [fetchPosts]);
    return <><AppHeader /><div className="page-wrap explore-page">
  <div className="explore-head"><div><span className="section-label">EXPLORE</span><h1>{tag ? `#${tag} 리뷰` : '리뷰 탐색'}</h1><p>실제로 써본 사람들이 남긴 구체적인 경험을 살펴보세요.</p></div><Link href="/write" className="primary-cta"><PenLine size={17}/> 리뷰 쓰기</Link></div>
  <div className="filter-bar"><div className="category-scroll">{categories.map(c => <Link key={c} href={c === '전체' ? '/blog' : `/blog?tag=${encodeURIComponent(c)}`} className={(!tag && c === '전체') || tag === c ? 'active' : ''}>{c}</Link>)}</div><button><SlidersHorizontal size={17}/> 최신순</button></div>
  {error && <div className="error-panel">리뷰를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</div>}
  {isLoading && !posts.length ? <div className="card-grid skeleton-grid">{[1, 2, 3, 4, 5, 6].map(n => <div className="skeleton-card" key={n}/>)}</div> : posts.length ? <div className="card-grid">{posts.map(p => <ReviewCard key={p.id} review={p}/>)}</div> : <div className="polished-empty"><strong>아직 등록된 리뷰가 없어요.</strong><span>이 주제의 첫 경험을 공유해보세요.</span><Link href="/write">리뷰 작성하기</Link></div>}
  {hasMore && <button className="load-more" onClick={loadMore} disabled={isLoading}>{isLoading ? '불러오는 중…' : '리뷰 더 보기'}</button>}
  </div></>;
}
export default function BlogPage() { return <Suspense fallback={<div className="full-loading">리뷰를 불러오는 중…</div>}><Reviews /></Suspense>; }

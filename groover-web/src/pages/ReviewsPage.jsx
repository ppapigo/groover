import { Link, useSearchParams } from 'react-router-dom';
import { PenLine } from 'lucide-react';
import ReviewCard from '@/components/review/ReviewCard';
import ErrorNotice from '@/components/ErrorNotice';
import { useFeed } from '@/hooks/useFeed';

const categories = ['전체', '디지털', '생활가전', '뷰티', '패션', '주방', '취미'];

export default function ReviewsPage() {
  const [params, setParams] = useSearchParams();
  const tag = params.get('tag') || '';
  const sort = params.get('sort') === 'popular' ? 'popular' : 'latest';
  const { posts, isLoading, error, hasMore, isLoadingMore, loadMore, refresh } = useFeed({ tag, sort });
  return <div className="page-wrap explore-page">
    <div className="explore-head"><div><span className="section-label">EXPLORE</span><h1>{tag ? `#${tag} 리뷰` : '리뷰 탐색'}</h1><p>실제로 써본 사람들이 남긴 구체적인 경험을 살펴보세요.</p></div><Link to="/write" className="primary-cta"><PenLine size={17} /> 리뷰 쓰기</Link></div>
    <div className="filter-bar">
      <div className="category-scroll">{categories.map(category => <Link key={category} to={category === '전체' ? '/blog' : `/blog?tag=${encodeURIComponent(category)}`} className={(!tag && category === '전체') || tag === category ? 'active' : ''}>{category}</Link>)}</div>
      {!tag && <select aria-label="리뷰 정렬" value={sort} onChange={event => setParams(event.target.value === 'popular' ? { sort: 'popular' } : {})}><option value="latest">최신순</option><option value="popular">인기순</option></select>}
    </div>
    <ErrorNotice error={error} retry={refresh} />
    {isLoading ? <div className="full-loading" role="status">리뷰를 불러오는 중…</div> : posts.length ? <div className="card-grid">{posts.map(review => <ReviewCard key={review.id} review={review} />)}</div> : !error && <div className="polished-empty"><strong>아직 등록된 리뷰가 없어요.</strong><Link to="/write">리뷰 작성하기</Link></div>}
    {hasMore && <button className="load-more" onClick={loadMore} disabled={isLoadingMore}>{isLoadingMore ? '불러오는 중…' : '리뷰 더 보기'}</button>}
  </div>;
}

import { Link } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { reviewApi } from '@/lib/reviewApi';
import ReviewCard from '@/components/review/ReviewCard';
import ErrorNotice from '@/components/ErrorNotice';

export default function MyReviewsPage({ draftsOnly = false }) {
  const { user } = useAuth();
  // /my-drafts only returns the first 50 records; paginate /my-posts so older drafts remain reachable.
  const query = useInfiniteQuery({
    queryKey: ['reviews', 'mine', user.id],
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => reviewApi.mine(pageParam, signal),
    getNextPageParam: page => page.hasMore ? Number(page.nextCursor) : undefined,
  });
  const reviews = (query.data?.pages.flatMap(page => page.items) || []).filter(review => !draftsOnly || review.status === 'DRAFT');
  return <div className="page-wrap explore-page">
    <div className="explore-head"><div><span className="section-label">MY REVIEWS</span><h1>{draftsOnly ? '임시저장' : '내 리뷰'}</h1></div><Link to="/write" className="primary-cta">리뷰 쓰기</Link></div>
    <ErrorNotice error={query.error} retry={query.refetch} />
    {query.isPending ? <div className="full-loading" role="status">기록을 불러오는 중…</div> : reviews.length ? <div className="card-grid">{reviews.map(review => <div key={review.id} className="my-review"><ReviewCard review={review} /><Link className="secondary-cta" to={`/write?edit=${review.id}`}>{review.status === 'DRAFT' ? '이어서 작성' : '리뷰 수정'}</Link></div>)}</div> : !query.error && <div className="polished-empty"><strong>{query.hasNextPage ? '현재 목록에는 임시저장한 리뷰가 없어요.' : '아직 저장한 리뷰가 없어요.'}</strong><Link to="/write">리뷰 작성하기</Link></div>}
    {query.hasNextPage && <button className="load-more" disabled={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>{query.isFetchingNextPage ? '불러오는 중…' : '이전 기록 더 보기'}</button>}
  </div>;
}

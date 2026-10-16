import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import ReviewCard from '@/components/review/ReviewCard';
import ErrorNotice from '@/components/ErrorNotice';
import { reviewApi } from '@/lib/reviewApi';

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') || '';
  const [debounced, setDebounced] = useState(query.trim());
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);
  const { data: results = [], isPending, error, refetch } = useQuery({
    queryKey: ['reviews', 'search', debounced],
    queryFn: ({ signal }) => reviewApi.search(debounced, signal),
    enabled: Boolean(debounced),
  });
  const updateQuery = value => setParams(value ? { q: value } : {}, { replace: true });
  const loading = query.trim() !== debounced || isPending;
  return <div className="page-wrap search-view">
    <div className="search-intro"><span className="section-label">SEARCH</span><h1>무엇을 찾고 있나요?</h1><p>제품명, 브랜드, 태그 또는 궁금한 키워드로 리뷰를 검색해보세요.</p></div>
    <div className="search-box"><Search size={22} /><input aria-label="리뷰 검색" value={query} onChange={event => updateQuery(event.target.value)} placeholder="예: 무선 청소기, 가성비 키보드" />{query && <button onClick={() => updateQuery('')} aria-label="검색어 지우기"><X size={18} /></button>}</div>
    {!query.trim() ? <div className="search-suggestions"><span>추천 검색어</span>{['한 달 사용기', '재구매', '가성비', '직접 구매', '장단점'].map(keyword => <button key={keyword} onClick={() => updateQuery(keyword)}>{keyword}</button>)}</div> : loading ? <div className="full-loading" role="status">꼼꼼히 찾고 있어요…</div> : error ? <ErrorNotice error={error} retry={refetch} /> : results.length ? <><div className="result-count"><b>“{debounced}”</b> 검색 결과 {results.length}개</div><div className="card-grid">{results.map(review => <ReviewCard key={review.id} review={review} />)}</div></> : <div className="polished-empty"><strong>일치하는 리뷰가 없어요.</strong><span>조금 더 짧거나 다른 단어로 검색해보세요.</span></div>}
  </div>;
}

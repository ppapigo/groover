'use client';
import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import AppHeader from '@/components/layout/AppHeader';
import ReviewCard from '@/components/review/ReviewCard';
export default function SearchPage() { const [query, setQuery] = useState(''); const [results, setResults] = useState([]); const [loading, setLoading] = useState(false); useEffect(() => { if (!query.trim()) {
    setResults([]);
    return;
} const timer = setTimeout(async () => { setLoading(true); try {
    const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/v1'}/search?q=${encodeURIComponent(query.trim())}`);
    const d = await r.json();
    setResults(d.posts || d.data?.posts || []);
}
catch {
    setResults([]);
}
finally {
    setLoading(false);
} }, 350); return () => clearTimeout(timer); }, [query]); return <><AppHeader /><div className="page-wrap search-view"><div className="search-intro"><span className="section-label">SEARCH</span><h1>무엇을 찾고 있나요?</h1><p>제품명, 브랜드, 태그 또는 궁금한 키워드로 리뷰를 검색해보세요.</p></div><div className="search-box"><Search size={22}/><input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="예: 무선 청소기, 민감성 피부, 가성비 키보드"/>{query && <button onClick={() => setQuery('')} aria-label="검색어 지우기"><X size={18}/></button>}</div>{!query && <div className="search-suggestions"><span>추천 검색어</span>{['한 달 사용기', '재구매', '가성비', '직접 구매', '장단점'].map(k => <button key={k} onClick={() => setQuery(k)}>{k}</button>)}</div>}{loading ? <div className="full-loading">꼼꼼히 찾고 있어요…</div> : query && results.length ? <><div className="result-count"><b>“{query}”</b> 검색 결과 {results.length}개</div><div className="card-grid">{results.map(r => <ReviewCard key={r.id} review={r}/>)}</div></> : query && !results.length ? <div className="polished-empty"><strong>일치하는 리뷰가 없어요.</strong><span>조금 더 짧거나 다른 단어로 검색해보세요.</span></div> : null}</div></>; }

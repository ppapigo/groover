import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Search, ShieldCheck, Sparkles } from 'lucide-react';
import ReviewCard from '@/components/review/ReviewCard';
import { useFeed } from '@/hooks/useFeed';
import { reviewApi } from '@/lib/reviewApi';
import ErrorNotice from '@/components/ErrorNotice';
export default function HomePage() {
    const { posts, isLoading, error } = useFeed({ limit: 6 });
    const { data: tags = [] } = useQuery({ queryKey: ['tags'], queryFn: ({ signal }) => reviewApi.tags(signal) });
    return <div className="page-wrap">
    <section className="hero">
      <div className="hero-copy"><span className="eyebrow"><Sparkles size={15}/> 취향이 쌓이는 리뷰 아카이브</span><h1>사기 전에,<br /><em>진짜 써본 사람</em>의 이야기를.</h1><p>넘쳐나는 광고 대신 구체적인 사용 경험을 모았습니다. 오래 쓸 물건을 더 잘 고르는 방법, Groover에서 시작하세요.</p><div className="hero-actions"><Link to="/blog" className="primary-cta">리뷰 둘러보기 <ArrowRight size={18}/></Link><Link to="/write" className="secondary-cta">내 경험 기록하기</Link></div><div className="trust-row"><ShieldCheck size={17}/><span>협찬 여부와 구매 상태를 투명하게 표시해요</span></div></div>
      <div className="hero-panel"><Link to="/search" className="hero-search"><Search size={19}/><span>어떤 제품이 궁금한가요?</span></Link><div className="hero-quote"><span>EDITOR&apos;S PICK</span><strong>“스펙표에는 없는<br />한 달 뒤의 이야기”</strong><p>장점뿐 아니라 아쉬운 점까지 확인하세요.</p></div><div className="floating-note note-one">평점보다 맥락</div><div className="floating-note note-two">직접 구매 리뷰</div></div>
    </section>
    <section className="content-section tag-strip"><div><span className="section-label">TRENDING</span><h2>요즘 많이 찾는 주제</h2></div><div className="tag-list">{tags.length ? tags.map(t => <Link key={t.name} to={`/blog?tag=${encodeURIComponent(t.name)}`}>#{t.name}<small>{t.postCount}</small></Link>) : ['생활가전', '디지털', '뷰티', '주방', '취미'].map(t => <Link key={t} to={`/blog?tag=${t}`}>#{t}</Link>)}</div></section>
    <section className="content-section"><div className="section-heading"><div><span className="section-label">FRESH REVIEWS</span><h2>새로 도착한 사용 후기</h2><p>방금 업데이트된 생생한 경험을 읽어보세요.</p></div><Link to="/blog">전체 리뷰 <ArrowRight size={16}/></Link></div>{error ? <ErrorNotice error={error} /> : isLoading ? <div className="card-grid skeleton-grid">{[1, 2, 3].map(n => <div className="skeleton-card" key={n}/>)}</div> : posts.length ? <div className="card-grid">{posts.slice(0, 6).map((p, i) => <ReviewCard key={p.id} review={p} featured={i === 0}/>)}</div> : <div className="polished-empty"><span>첫 번째 기록을 기다리고 있어요.</span><Link to="/write">리뷰 작성하기</Link></div>}</section>
    <section className="editorial-banner"><div><span className="section-label">WRITE WITH GROOVER</span><h2>당신의 경험이<br />누군가의 좋은 선택이 됩니다.</h2></div><Link to="/write">첫 리뷰 남기기 <ArrowRight size={18}/></Link></section>
  </div>;
}

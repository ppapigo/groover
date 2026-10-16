import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart, Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { reviewApi } from '@/lib/reviewApi';
import { dateLabel, imageUrl } from '@/lib/reviewContent';
import ErrorNotice from '@/components/ErrorNotice';
import ReviewContent from '@/components/review/ReviewContent';
import Comments from '@/components/review/Comments';

export default function ReviewPage() {
  const { slug } = useParams();
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const client = useQueryClient();
  const queryKey = ['reviews', 'detail', slug, user?.id];
  const query = useQuery({ queryKey, queryFn: ({ signal }) => reviewApi.get(slug, signal), enabled: !isLoading });
  const review = query.data;
  const like = useMutation({
    mutationFn: () => reviewApi.like(review.id),
    onSuccess: (data) => {
      client.setQueryData(queryKey, current => ({ ...current, ...data }));
      client.invalidateQueries({ queryKey: ['reviews', 'feed'] });
      client.invalidateQueries({ queryKey: ['reviews', 'mine'] });
      client.invalidateQueries({ queryKey: ['reviews', 'search'] });
    },
  });
  const remove = useMutation({
    mutationFn: () => reviewApi.remove(review.id),
    onSuccess: () => {
      navigate('/profile/posts', { replace: true });
      client.removeQueries({ queryKey: ['reviews', 'detail', slug] });
      client.invalidateQueries({ queryKey: ['reviews'] });
    },
  });
  if (query.isPending) return <div className="full-loading" role="status">리뷰를 불러오는 중…</div>;
  if (query.error) return <div className="form-page"><ErrorNotice error={query.error} retry={query.refetch} /><Link to="/blog">리뷰 목록으로</Link></div>;
  const metadata = review.metadata || {};
  return <article className="detail-page">
    <Link to="/blog" className="text-button">← 리뷰 목록</Link>
    <div className="review-heading"><span className="section-label">{review.status === 'DRAFT' ? '임시저장' : metadata.productName || '사용자 리뷰'}</span><h1>{review.title}</h1><p className="muted">{review.author.name} · {dateLabel(review.publishedAt || review.createdAt)} · 조회 {review.viewCount}</p></div>
    <div className="review-metadata">
      {metadata.rating && <span><Star size={16} /> {metadata.rating} / 5</span>}
      {metadata.purchaseStatus && <span>{metadata.purchaseStatus}</span>}
      {metadata.price != null && <span>{Number(metadata.price).toLocaleString('ko-KR')}원</span>}
      {metadata.storeName && <span>구매처: {metadata.storeName}</span>}
    </div>
    {imageUrl(review.previewImage) && <img className="detail-image" src={imageUrl(review.previewImage)} alt={review.title} />}
    {review.excerpt && <p className="review-excerpt">{review.excerpt}</p>}
    <ReviewContent content={review.content} />
    <div className="tag-list detail-tags">{review.tags.map(tag => <Link key={tag} to={`/blog?tag=${encodeURIComponent(tag)}`}>#{tag}</Link>)}</div>
    <div className="review-actions">
      <button className="secondary-cta" aria-pressed={review.liked} disabled={like.isPending} onClick={() => { if (!user) navigate(`/login?redirect=${encodeURIComponent(`/blog/${slug}`)}`); else like.mutate(); }}><Heart size={18} fill={review.liked ? 'currentColor' : 'none'} /> 좋아요 {review.likeCount}</button>
      {user?.id === review.author.id && <><Link className="secondary-cta" to={`/write?edit=${review.id}`}>수정</Link><button className="text-button danger" disabled={remove.isPending} onClick={() => { if (window.confirm('이 리뷰를 삭제할까요?')) remove.mutate(); }}>삭제</button></>}
    </div>
    <ErrorNotice error={like.error || remove.error} />
    {review.status === 'PUBLISHED' && <Comments review={review} />}
  </article>;
}

import { Link } from 'react-router-dom';
import { Eye, Heart, MessageCircle, Star } from 'lucide-react';
import { dateLabel, imageUrl } from '@/lib/reviewContent';
export default function ReviewCard({ review, featured = false }) {
    const summary = review.excerpt || review.content?.replace(/<[^>]*>/g, '').slice(0, 120) || '';
    return (<Link to={review.status === 'DRAFT' ? `/write?edit=${review.id}` : `/blog/${review.slug}`} className={`review-card ${featured ? 'review-card-featured' : ''}`}>
      <div className="review-card-media">
        {imageUrl(review.previewImage) ? <img src={imageUrl(review.previewImage)} alt="" loading="lazy"/> : <div className="review-card-placeholder"><span>G</span></div>}
        {review.metadata?.rating && <span className="rating-badge"><Star size={13} fill="currentColor"/> {review.metadata.rating}.0</span>}
      </div>
      <div className="review-card-body">
        <div className="review-card-kicker">{review.status === 'DRAFT' ? '임시저장' : review.metadata?.productName || review.tags?.[0] || '사용자 리뷰'}</div>
        <h3>{review.title}</h3>
        <p>{summary}</p>
        <div className="review-card-tags">{review.tags?.slice(0, 3).map(tag => <span key={tag}>#{tag}</span>)}</div>
        <div className="review-card-footer">
          <span><b>{review.author?.name || '익명'}</b> · {dateLabel(review.publishedAt || review.createdAt)}</span>
          <span className="review-card-stats"><Eye size={14}/> {review.viewCount}<Heart size={14}/> {review.likeCount}<MessageCircle size={14}/> {review.commentCount || 0}</span>
        </div>
      </div>
    </Link>);
}

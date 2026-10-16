import { imageUrl } from '@/lib/reviewContent';

export default function ReviewContent({ content = '' }) {
  return <div className="review-content">{content.split(/(!\[[^\]]*\]\([^\s)]+\))/g).map((part, index) => {
    const match = part.match(/^!\[([^\]]*)\]\(([^\s)]+)\)$/);
    if (match && imageUrl(match[2])) return <img key={index} src={imageUrl(match[2])} alt={match[1] || '리뷰 사진'} loading="lazy" />;
    return <span key={index}>{part}</span>;
  })}</div>;
}

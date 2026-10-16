import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { reviewApi } from '@/lib/reviewApi';
import { dateLabel } from '@/lib/reviewContent';
import ErrorNotice from '@/components/ErrorNotice';

export default function Comments({ review }) {
  const { user } = useAuth();
  const client = useQueryClient();
  const [content, setContent] = useState('');
  const query = useQuery({ queryKey: ['comments', review.id], queryFn: ({ signal }) => reviewApi.comments(review.id, signal) });
  const mutation = useMutation({
    mutationFn: async ({ deleteId }) => deleteId ? reviewApi.removeComment(deleteId) : reviewApi.comment(review.id, content.trim()),
    onSuccess: async (_, variables) => {
      if (!variables.deleteId) setContent('');
      await Promise.all([client.invalidateQueries({ queryKey: ['comments', review.id] }), client.invalidateQueries({ queryKey: ['reviews'] })]);
    },
  });
  return <section className="comments-section">
    <h2>댓글 {query.data?.length ?? review.commentCount}</h2>
    {user ? <form className="stack-form" onSubmit={event => { event.preventDefault(); if (content.trim() && !mutation.isPending) mutation.mutate({}); }}>
      <label>댓글 남기기<textarea required maxLength={2000} rows={3} value={content} disabled={mutation.isPending} onChange={event => setContent(event.target.value)} /></label>
      <button className="primary-cta" disabled={!content.trim() || mutation.isPending}>댓글 등록</button>
    </form> : <p><Link to={`/login?redirect=${encodeURIComponent(`/blog/${review.slug}`)}`}>로그인</Link>하고 댓글을 남겨보세요.</p>}
    <ErrorNotice error={mutation.error || query.error} retry={query.error ? query.refetch : undefined} />
    {query.isPending ? <p role="status">댓글을 불러오는 중…</p> : query.data?.map(comment => <article className="comment" key={comment.id}>
      <div className="comment-heading"><strong>{comment.author.name}</strong><time dateTime={comment.createdAt}>{dateLabel(comment.createdAt)}</time>{user?.id === comment.author.id && <button className="text-button" disabled={mutation.isPending} onClick={() => { if (window.confirm('댓글을 삭제할까요?')) mutation.mutate({ deleteId: comment.id }); }}>삭제</button>}</div>
      <p>{comment.content}</p>
    </article>)}
  </section>;
}

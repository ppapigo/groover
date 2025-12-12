// src/components/blog/CommentSection.tsx
'use client';

import { useState } from 'react';
import { Heart, Reply, User } from 'lucide-react';

interface Comment {
  id: string;
  author: string;
  content: string;
  date: string;
  likes: number;
}

interface CommentSectionProps {
  postId: string;
  initialComments?: Comment[];
}

export default function CommentSection({ postId, initialComments = [] }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments.length > 0 ? initialComments : [
    { id: '1', author: 'user123', content: '정말 유용해요! 뽀로로 고민 중이었는데 참고할게요!', date: '2024.12.02', likes: 5 },
    { id: '2', author: 'mommy88', content: '저도 샀는데 대만족 리뷰 공감해요~', date: '2024.12.01', likes: 3 },
    { id: '3', author: '쇼핑러', content: '육아용품 아니어도 쇼핑러한테도 도움 되네요!', date: '2024.11.30', likes: 2 },
  ]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    setIsSubmitting(true);

    const comment: Comment = {
      id: Date.now().toString(),
      author: '나',
      content: newComment,
      date: new Date().toLocaleDateString('ko-KR').replace(/\. /g, '.').slice(0, -1),
      likes: 0,
    };

    setComments([comment, ...comments]);
    setNewComment('');
    setIsSubmitting(false);
  };

  return (
    <div style={{ padding: '16px', borderTop: '8px solid #f5f5f5' }}>
      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
        댓글 {comments.length}
      </h3>

      {/* 댓글 입력 */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="댓글을 입력하세요..."
          style={{
            flex: 1,
            padding: '10px 14px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            fontSize: '14px',
            outline: 'none',
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !newComment.trim()}
          style={{
            padding: '10px 16px',
            background: newComment.trim() ? '#0f62fe' : '#ccc',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: newComment.trim() ? 'pointer' : 'not-allowed',
            whiteSpace: 'nowrap',
          }}
        >
          등록
        </button>
      </div>

      {/* 댓글 목록 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {comments.map((comment) => (
          <div
            key={comment.id}
            style={{
              padding: '12px',
              background: '#f9fafb',
              borderRadius: '10px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px',
              }}
            >
              <span style={{ fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <User size={14} /> {comment.author}
              </span>
              <span style={{ fontSize: '11px', color: '#999' }}>{comment.date}</span>
            </div>
            <p style={{ fontSize: '14px', lineHeight: '1.5', color: '#333' }}>
              {comment.content}
            </p>
            <div style={{ marginTop: '8px', display: 'flex', gap: '12px' }}>
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '12px',
                  color: '#666',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Heart size={14} /> {comment.likes}
              </button>
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '12px',
                  color: '#999',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Reply size={14} /> 답글
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
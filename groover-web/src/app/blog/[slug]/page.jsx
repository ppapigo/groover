// src/app/blog/[slug]/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { ChevronLeft, Share2, Heart, Eye, User, MessageCircle, MoreVertical, Flag, Send } from 'lucide-react';
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}
function formatTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1)
        return '방금 전';
    if (minutes < 60)
        return `${minutes}분 전`;
    if (hours < 24)
        return `${hours}시간 전`;
    if (days < 7)
        return `${days}일 전`;
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}
function MarkdownContent({ content }) {
    if (!content)
        return null;
    const parts = content.split(/(!\[[^\]]*\]\([^)]+\))/g);
    return (<div className="space-y-4">
      {parts.map((part, index) => {
            const imageMatch = part.match(/!\[([^\]]*)\]\(([^)]+)\)/);
            if (imageMatch) {
                const [, alt, url] = imageMatch;
                return (<div key={index} className="relative -mx-5 md:mx-0 md:rounded-xl overflow-hidden">
              <img src={url} alt={alt || '이미지'} className="w-full h-auto" onError={(e) => {
                        e.target.style.display = 'none';
                    }}/>
            </div>);
            }
            if (part.trim()) {
                const lines = part.split('\n').filter(line => line.trim());
                return (<div key={index}>
              {lines.map((line, lineIndex) => (<p key={lineIndex} className="text-base leading-relaxed text-text-primary">
                  {line || '\u00A0'}
                </p>))}
            </div>);
            }
            return null;
        })}
    </div>);
}
function DetailSkeleton() {
    return (<div className="animate-pulse">
      <div className="h-64 bg-card-soft"/>
      <div className="px-5 py-6 space-y-4">
        <div className="h-8 bg-card-soft rounded w-3/4"/>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-card-soft rounded-full"/>
          <div className="space-y-2">
            <div className="h-4 bg-card-soft rounded w-24"/>
            <div className="h-3 bg-card-soft rounded w-16"/>
          </div>
        </div>
        <div className="space-y-3 pt-4">
          <div className="h-4 bg-card-soft rounded w-full"/>
          <div className="h-4 bg-card-soft rounded w-full"/>
          <div className="h-4 bg-card-soft rounded w-2/3"/>
        </div>
      </div>
    </div>);
}
function CommentItem({ comment, user, onReply, onLike, onReport, onDelete, depth = 0 }) {
    const [showMenu, setShowMenu] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const isAuthor = user && comment.user.id === user.id;
    return (<div style={{ marginLeft: depth > 0 ? 32 : 0, marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: '#f0f0f0',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
        }}>
          {comment.user.profileImageUrl ? (<img src={comment.user.profileImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>) : (<User size={18} color="#999"/>)}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{comment.user.name}</span>
            <span style={{ fontSize: 12, color: '#999' }}>{formatTime(comment.createdAt)}</span>
          </div>
          
          <p style={{ fontSize: 14, lineHeight: 1.5, color: '#333', marginBottom: 8 }}>
            {comment.content}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button onClick={() => {
            setIsLiked(!isLiked);
            onLike(comment.id);
        }} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 13,
            color: isLiked ? '#ff6f0f' : '#999',
        }}>
              <Heart size={14} fill={isLiked ? '#ff6f0f' : 'none'}/>
              {comment.likeCount > 0 && comment.likeCount}
            </button>

            <button onClick={() => onReply(comment.id, comment.user.name)} style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 13,
            color: '#999',
        }}>
              답글
            </button>

            <div style={{ position: 'relative', marginLeft: 'auto' }}>
              <button onClick={() => setShowMenu(!showMenu)} style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            color: '#999',
        }}>
                <MoreVertical size={16}/>
              </button>

              {showMenu && (<div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                background: '#fff',
                borderRadius: 8,
                boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
                overflow: 'hidden',
                zIndex: 10,
                minWidth: 100,
            }}>
                  {isAuthor && (<button onClick={() => {
                    setShowMenu(false);
                    onDelete(comment.id);
                }} style={{
                    display: 'block',
                    width: '100%',
                    padding: '10px 16px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 14,
                    color: '#ff4444',
                    textAlign: 'left',
                }}>
                      삭제
                    </button>)}
                  <button onClick={() => {
                setShowMenu(false);
                onReport(comment.id);
            }} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '10px 16px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                color: '#666',
                textAlign: 'left',
            }}>
                    <Flag size={14}/>
                    신고
                  </button>
                </div>)}
            </div>
          </div>
        </div>
      </div>

      {comment.replies && comment.replies.length > 0 && (<div style={{ marginTop: 12 }}>
          {comment.replies.map(reply => (<CommentItem key={reply.id} comment={reply} user={user} onReply={onReply} onLike={onLike} onReport={onReport} onDelete={onDelete} depth={depth + 1}/>))}
        </div>)}
    </div>);
}
export default function BlogDetailPage({ params }) {
    const router = useRouter();
    const { user } = useAuth();
    const [post, setPost] = useState(null);
    const [comments, setComments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLiked, setIsLiked] = useState(false);
    const [commentInput, setCommentInput] = useState('');
    const [replyTo, setReplyTo] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    useEffect(() => {
        fetchPost();
        fetchComments();
    }, [params.slug]);
    const fetchPost = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/v1'}/blog/posts/${params.slug}`);
            const data = await res.json();
            if (data.success) {
                setPost(data.data);
            }
        }
        catch (err) {
            console.error('글 불러오기 실패:', err);
        }
        finally {
            setIsLoading(false);
        }
    };
    const fetchComments = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/v1'}/blog/posts/${params.slug}/comments`);
            const data = await res.json();
            if (data.success) {
                setComments(data.data || []);
            }
        }
        catch (err) {
            console.error('댓글 불러오기 실패:', err);
        }
    };
    const handleLike = async () => {
        if (!user) {
            router.push('/login');
            return;
        }
        if (!post)
            return;
        try {
            const token = localStorage.getItem('accessToken');
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/v1'}/blog/posts/${post.id}/like`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            setIsLiked(!isLiked);
            setPost({ ...post, likeCount: post.likeCount + (isLiked ? -1 : 1) });
        }
        catch (err) {
            console.error('좋아요 실패:', err);
        }
    };
    const handleDelete = async () => {
        if (!post)
            return;
        if (!confirm('정말 삭제하시겠습니까?'))
            return;
        try {
            const token = localStorage.getItem('accessToken');
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/v1'}/blog/posts/${post.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            alert('삭제되었습니다.');
            router.push('/blog');
        }
        catch (err) {
            alert('삭제에 실패했습니다.');
        }
    };
    const handleShare = () => {
        if (navigator.share) {
            navigator.share({ title: post?.title, url: window.location.href });
        }
        else {
            navigator.clipboard.writeText(window.location.href);
            alert('링크가 복사되었습니다.');
        }
    };
    const handleSubmitComment = async () => {
        if (!commentInput.trim() || isSubmitting)
            return;
        if (!user) {
            router.push('/login');
            return;
        }
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/v1'}/blog/posts/${post?.id}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    content: commentInput,
                    parentId: replyTo?.id || null,
                }),
            });
            if (res.ok) {
                setCommentInput('');
                setReplyTo(null);
                fetchComments();
                if (post) {
                    setPost({ ...post, commentCount: post.commentCount + 1 });
                }
            }
        }
        catch (err) {
            console.error('댓글 작성 실패:', err);
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const handleReply = (commentId, userName) => {
        setReplyTo({ id: commentId, name: userName });
    };
    const handleCommentLike = async (commentId) => {
        if (!user) {
            router.push('/login');
            return;
        }
        try {
            const token = localStorage.getItem('accessToken');
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/v1'}/blog/comments/${commentId}/like`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
        }
        catch (err) {
            console.error('댓글 좋아요 실패:', err);
        }
    };
    const handleCommentReport = (commentId) => {
        if (!user) {
            router.push('/login');
            return;
        }
        if (confirm('이 댓글을 신고하시겠습니까?')) {
            alert('신고가 접수되었습니다.');
        }
    };
    const handleCommentDelete = async (commentId) => {
        if (!confirm('댓글을 삭제하시겠습니까?'))
            return;
        try {
            const token = localStorage.getItem('accessToken');
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/v1'}/blog/comments/${commentId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            fetchComments();
            if (post) {
                setPost({ ...post, commentCount: Math.max(0, post.commentCount - 1) });
            }
        }
        catch (err) {
            console.error('댓글 삭제 실패:', err);
        }
    };
    if (isLoading) {
        return (<div className="min-h-screen bg-white">
        <header className="sticky top-0 z-20 bg-white border-b border-border">
          <div className="flex items-center h-14 px-4">
            <button onClick={() => router.back()} className="p-2 -ml-2">
              <ChevronLeft size={24}/>
            </button>
          </div>
        </header>
        <DetailSkeleton />
      </div>);
    }
    if (!post) {
        return (<div className="min-h-screen bg-white">
        <header className="sticky top-0 z-20 bg-white border-b border-border">
          <div className="flex items-center h-14 px-4">
            <button onClick={() => router.back()} className="p-2 -ml-2">
              <ChevronLeft size={24}/>
            </button>
          </div>
        </header>
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <p className="empty-state-text mb-4">글을 찾을 수 없습니다</p>
          <Link href="/blog" className="btn-primary">
            목록으로 돌아가기
          </Link>
        </div>
      </div>);
    }
    const hasContentImages = post.content.includes('![');
    return (<div className="min-h-screen bg-white" style={{ paddingBottom: 140 }}>
      {/* 헤더 */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ChevronLeft size={24}/>
          </button>
          <button onClick={handleShare} className="p-2 -mr-2">
            <Share2 size={22}/>
          </button>
        </div>
      </header>

      {/* 썸네일 이미지 */}
      {post.previewImage && !hasContentImages && (<div className="relative aspect-video w-full overflow-hidden bg-card-soft">
          <img src={post.previewImage} alt={post.title} className="w-full h-full object-cover"/>
        </div>)}

      {/* 콘텐츠 */}
      <article className="px-5 py-6">
        <h1 className="text-2xl font-bold text-text-primary leading-tight mb-5">
          {post.title}
        </h1>

        {/* 작성자 정보 */}
        <Link href={`/profile/${post.author.id}`} className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-full bg-card-soft overflow-hidden flex items-center justify-center">
            {post.author.profileImageUrl ? (<img src={post.author.profileImageUrl} alt={post.author.name} className="w-full h-full object-cover"/>) : (<User size={24} className="text-text-tertiary"/>)}
          </div>
          <div>
            <p className="font-semibold text-text-primary">{post.author.name}</p>
            <p className="text-sm text-text-tertiary">{formatDate(post.publishedAt)}</p>
          </div>
        </Link>

        {/* 태그 */}
        {post.tags && post.tags.length > 0 && (<div className="flex flex-wrap gap-2 mb-6">
            {post.tags.map(tag => (<Link key={tag} href={`/blog?tag=${encodeURIComponent(tag)}`} className="px-3 py-1.5 bg-primary-light text-primary text-sm font-medium rounded-chip">
                #{tag}
              </Link>))}
          </div>)}

        <div className="divider mb-6"/>

        {/* 본문 */}
        <div className="prose-groover">
          <MarkdownContent content={post.content}/>
        </div>

        {/* 좋아요/조회수/댓글 통계 */}
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '16px 0',
            marginTop: 24,
            borderTop: '1px solid #f0f0f0',
            borderBottom: '1px solid #f0f0f0',
        }}>
          <button onClick={handleLike} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: isLiked ? '#ff6f0f' : '#666',
        }}>
            <Heart size={20} fill={isLiked ? '#ff6f0f' : 'none'}/>
            <span style={{ fontWeight: 600 }}>{post.likeCount}</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#666' }}>
            <MessageCircle size={20}/>
            <span>{post.commentCount || 0}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#999' }}>
            <Eye size={20}/>
            <span>{post.viewCount}</span>
          </div>
        </div>

        {/* 수정/삭제 버튼 (작성자만) */}
        {user && post.author.id === user.id && (<div className="flex gap-3 mt-6 pt-6 border-t border-border">
            <Link href={`/write?edit=${post.id}`} className="btn-primary flex-1 text-center">
              수정하기
            </Link>
            <button onClick={handleDelete} className="btn-secondary flex-1 text-error">
              삭제하기
            </button>
          </div>)}

        {/* 댓글 섹션 */}
        <div style={{ marginTop: 32 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
            댓글 {post.commentCount || 0}
          </h3>

          {comments.length === 0 ? (<p style={{ color: '#999', textAlign: 'center', padding: '24px 0' }}>
              첫 댓글을 남겨보세요!
            </p>) : (comments.map(comment => (<CommentItem key={comment.id} comment={comment} user={user} onReply={handleReply} onLike={handleCommentLike} onReport={handleCommentReport} onDelete={handleCommentDelete}/>)))}
        </div>
      </article>

      {/* 하단 댓글 입력창 */}
      <div style={{
            position: 'fixed',
            bottom: 64,
            left: 0,
            right: 0,
            background: '#fff',
            borderTop: '1px solid #eee',
            padding: '12px 16px',
            zIndex: 30,
        }}>
        {replyTo && (<div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: '#f5f5f5',
                borderRadius: 8,
                marginBottom: 8,
                fontSize: 13,
            }}>
            <span style={{ color: '#666' }}>
              <strong>{replyTo.name}</strong>님에게 답글
            </span>
            <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}>
              ✕
            </button>
          </div>)}
        
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input value={commentInput} onChange={(e) => setCommentInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmitComment()} placeholder={user ? "댓글을 입력하세요..." : "로그인 후 댓글을 작성할 수 있습니다"} disabled={!user} style={{
            flex: 1,
            padding: '12px 16px',
            border: '1px solid #eee',
            borderRadius: 24,
            fontSize: 14,
            outline: 'none',
            background: user ? '#fff' : '#f5f5f5',
        }}/>
          <button onClick={handleSubmitComment} disabled={!commentInput.trim() || isSubmitting || !user} style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: commentInput.trim() && !isSubmitting ? '#0f62fe' : '#ddd',
            color: '#fff',
            border: 'none',
            cursor: commentInput.trim() && !isSubmitting ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        }}>
            <Send size={20}/>
          </button>
        </div>
      </div>
    </div>);
}

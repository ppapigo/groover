// src/app/my-posts/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthGuard } from '@/components/auth/AuthGuard';
import api from '@/lib/api';
export default function MyPostsPage() {
    const router = useRouter();
    const [posts, setPosts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        fetchPosts();
    }, []);
    const fetchPosts = async () => {
        try {
            const res = await api.get('/blog/my-posts');
            setPosts(res.data.data.items || []);
        }
        catch (err) {
            console.error('Failed to fetch posts:', err);
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleDelete = async (postId) => {
        if (!confirm('정말 삭제하시겠습니까?'))
            return;
        try {
            await api.delete(`/blog/posts/${postId}`);
            setPosts(posts.filter(p => p.id !== postId));
        }
        catch (err) {
            alert('삭제에 실패했습니다.');
        }
    };
    return (<AuthGuard>
      <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
        {/* 헤더 */}
        <header style={{
            padding: '16px',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #eee'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => router.back()} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>
              ←
            </button>
            <span style={{ fontSize: '16px', fontWeight: '600' }}>내가 쓴 글</span>
          </div>
          <Link href="/write" style={{
            padding: '8px 16px',
            background: '#0f62fe',
            color: '#fff',
            borderRadius: '20px',
            fontSize: '14px',
            textDecoration: 'none'
        }}>
            글쓰기
          </Link>
        </header>

        {/* 글 목록 */}
        <div style={{ padding: '16px' }}>
          {isLoading ? (<div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              로딩 중...
            </div>) : posts.length === 0 ? (<div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
              <p style={{ color: '#666', marginBottom: '24px' }}>아직 작성한 글이 없습니다.</p>
              <Link href="/write" style={{
                display: 'inline-block',
                padding: '12px 24px',
                background: '#0f62fe',
                color: '#fff',
                borderRadius: '10px',
                textDecoration: 'none',
            }}>
                첫 글 작성하기
              </Link>
            </div>) : (<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {posts.map(post => (<div key={post.id} style={{
                    background: '#fff',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}>
                  <div style={{ display: 'flex' }}>
                    {post.previewImage && (<div style={{
                        width: '100px',
                        height: '100px',
                        background: `url(${post.previewImage}) center/cover`,
                        flexShrink: 0,
                    }}/>)}
                    <div style={{ flex: 1, padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{
                    padding: '2px 8px',
                    background: post.status === 'PUBLISHED' ? '#dcfce7' : '#fef3c7',
                    color: post.status === 'PUBLISHED' ? '#16a34a' : '#d97706',
                    borderRadius: '4px',
                    fontSize: '11px',
                }}>
                          {post.status === 'PUBLISHED' ? '발행됨' : '임시저장'}
                        </span>
                      </div>
                      <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px', lineHeight: 1.3 }}>
                        {post.title}
                      </h3>
                      <p style={{ fontSize: '13px', color: '#666', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {post.excerpt}
                      </p>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#999' }}>
                        <span>👁 {post.viewCount}</span>
                        <span>❤️ {post.likeCount}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    borderTop: '1px solid #eee',
                }}>
                    <Link href={`/write?edit=${post.id}`} style={{
                    flex: 1,
                    padding: '12px',
                    textAlign: 'center',
                    color: '#0f62fe',
                    fontSize: '14px',
                    textDecoration: 'none',
                }}>
                      수정
                    </Link>
                    <button onClick={() => handleDelete(post.id)} style={{
                    flex: 1,
                    padding: '12px',
                    textAlign: 'center',
                    color: '#ef4444',
                    fontSize: '14px',
                    background: 'none',
                    border: 'none',
                    borderLeft: '1px solid #eee',
                    cursor: 'pointer',
                }}>
                      삭제
                    </button>
                  </div>
                </div>))}
            </div>)}
        </div>
      </div>
    </AuthGuard>);
}

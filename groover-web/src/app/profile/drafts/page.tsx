// src/app/drafts/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthGuard } from '@/components/auth/AuthGuard';
import api from '@/lib/api';

interface Draft {
  id: string;
  title: string;
  excerpt: string;
  previewImage: string | null;
  updatedAt: string;
}

export default function DraftsPage() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDrafts();
  }, []);

  const fetchDrafts = async () => {
    try {
      const res = await api.get('/blog/my-drafts');
      setDrafts(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch drafts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (draftId: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    try {
      await api.delete(`/blog/posts/${draftId}`);
      setDrafts(drafts.filter(d => d.id !== draftId));
    } catch (err) {
      alert('삭제에 실패했습니다.');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <AuthGuard>
      <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
        {/* 헤더 */}
        <header style={{ 
          padding: '16px', 
          background: '#fff',
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          borderBottom: '1px solid #eee'
        }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>
            ←
          </button>
          <span style={{ fontSize: '16px', fontWeight: '600' }}>임시저장</span>
        </header>

        {/* 임시저장 목록 */}
        <div style={{ padding: '16px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              로딩 중...
            </div>
          ) : drafts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
              <p style={{ color: '#666' }}>임시저장된 글이 없습니다.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {drafts.map(draft => (
                <div key={draft.id} style={{
                  background: '#fff',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}>
                  <Link href={`/write?edit=${draft.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ padding: '16px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>
                        {draft.title || '제목 없음'}
                      </h3>
                      <p style={{ fontSize: '13px', color: '#666', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {draft.excerpt || '내용 없음'}
                      </p>
                      <span style={{ fontSize: '12px', color: '#999' }}>
                        {formatDate(draft.updatedAt)}
                      </span>
                    </div>
                  </Link>
                  <div style={{ 
                    display: 'flex', 
                    borderTop: '1px solid #eee',
                  }}>
                    <Link href={`/write?edit=${draft.id}`} style={{
                      flex: 1,
                      padding: '12px',
                      textAlign: 'center',
                      color: '#0f62fe',
                      fontSize: '14px',
                      textDecoration: 'none',
                    }}>
                      이어쓰기
                    </Link>
                    <button onClick={() => handleDelete(draft.id)} style={{
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
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}

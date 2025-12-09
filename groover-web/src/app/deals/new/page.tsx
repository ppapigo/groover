'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthGuard } from '@/components/auth/AuthGuard';
import api from '@/lib/api';

export default function NewDealPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get('userId');

  const [targetUser, setTargetUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    amount: '',
    deadline: '',
  });

  useEffect(() => {
    if (targetUserId) {
      fetchTargetUser();
    }
  }, [targetUserId]);

  const fetchTargetUser = async () => {
    try {
      const res = await api.get(`/users/${targetUserId}`);
      setTargetUser(res.data.data || res.data);
    } catch (err) {
      console.error('사용자 정보 불러오기 실패:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId) {
      alert('대상 사용자를 선택해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post('/escrow/proposal', {
        creatorId: targetUserId,
        title: form.title,
        description: form.description,
        amount: parseInt(form.amount),
        deadline: new Date(form.deadline).toISOString(),
      });

      alert('광고 제안이 전송되었습니다!');
      router.push('/dashboard');
    } catch (err: any) {
      console.error('광고 제안 실패:', err);
      alert(err.response?.data?.message || '광고 제안에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthGuard>
      <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
        <header style={{ padding: 16, background: '#fff', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>←</button>
          <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>광고 제안하기</h1>
        </header>

        <form onSubmit={handleSubmit} style={{ padding: 16 }}>
          {/* 대상 사용자 */}
          {targetUser && (
            <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                {targetUser.profileImageUrl ? (
                  <img src={targetUser.profileImageUrl} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                ) : '👤'}
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>{targetUser.name}</div>
                <div style={{ fontSize: 13, color: '#999' }}>에게 광고 제안</div>
              </div>
            </div>
          )}

          {/* 제안 제목 */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>제안 제목</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="예: 육아용품 리뷰 콘텐츠 제작"
              required
              style={{ width: '100%', padding: 12, border: '1px solid #ddd', borderRadius: 8, fontSize: 15 }}
            />
          </div>

          {/* 상세 설명 */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>상세 설명</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="광고 내용, 요구사항 등을 상세히 작성해주세요."
              required
              rows={5}
              style={{ width: '100%', padding: 12, border: '1px solid #ddd', borderRadius: 8, fontSize: 15, resize: 'none' }}
            />
          </div>

          {/* 금액 */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>제안 금액 (원)</label>
            <input
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="100000"
              required
              min="1000"
              style={{ width: '100%', padding: 12, border: '1px solid #ddd', borderRadius: 8, fontSize: 15 }}
            />
          </div>

          {/* 마감일 */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>콘텐츠 마감일</label>
            <input
              type="date"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              required
              min={new Date().toISOString().split('T')[0]}
              style={{ width: '100%', padding: 12, border: '1px solid #ddd', borderRadius: 8, fontSize: 15 }}
            />
          </div>

          {/* 안내 */}
          <div style={{ background: '#e8f4ff', borderRadius: 12, padding: 16, marginBottom: 24 }}>
            <p style={{ fontSize: 13, color: '#0f62fe', margin: 0, lineHeight: 1.6 }}>
              💡 크리에이터가 제안을 수락하면 결제를 진행하게 됩니다.<br />
              결제 금액은 에스크로에 안전하게 보관되며, 콘텐츠 확인 후 정산됩니다.
            </p>
          </div>

          {/* 제출 버튼 */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: 16,
              background: isLoading ? '#ccc' : '#0f62fe',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {isLoading ? '전송 중...' : '광고 제안 보내기'}
          </button>
        </form>
      </div>
    </AuthGuard>
  );
}
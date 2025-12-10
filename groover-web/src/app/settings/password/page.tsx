// src/app/settings/password/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/auth/AuthGuard';
import api from '@/lib/api';

export default function PasswordChangePage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    if (newPassword.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.');
      return;
    }

    setIsLoading(true);
    try {
      await api.put('/users/me/password', {
        currentPassword,
        newPassword,
      });
      alert('비밀번호가 변경되었습니다.');
      router.back();
    } catch (err: any) {
      setError(err.response?.data?.message || '비밀번호 변경에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
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
          <span style={{ fontSize: '16px', fontWeight: '600' }}>비밀번호 변경</span>
        </header>

        {/* 폼 */}
        <form onSubmit={handleSubmit} style={{ padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '8px' }}>
                현재 비밀번호
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="현재 비밀번호 입력"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '15px',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '8px' }}>
                새 비밀번호
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="새 비밀번호 입력 (8자 이상)"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '15px',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '8px' }}>
                새 비밀번호 확인
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="새 비밀번호 다시 입력"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '15px',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {error && (
            <p style={{ color: '#ef4444', fontSize: '14px', marginBottom: '16px', textAlign: 'center' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading || !currentPassword || !newPassword || !confirmPassword}
            style={{
              width: '100%',
              padding: '14px',
              background: isLoading || !currentPassword || !newPassword || !confirmPassword ? '#ccc' : '#0f62fe',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {isLoading ? '변경 중...' : '비밀번호 변경'}
          </button>
        </form>
      </div>
    </AuthGuard>
  );
}

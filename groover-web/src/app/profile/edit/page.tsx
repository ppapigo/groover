// src/app/profile/edit/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AuthGuard } from '@/components/auth/AuthGuard';
import api from '@/lib/api';

export default function ProfileEditPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setProfileImage(user.profileImageUrl || null);
    }
  }, [user]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      await api.put('/auth/profile', { name, profileImageUrl: profileImage });
      setMessage('프로필이 수정되었습니다.');
      setTimeout(() => router.back(), 1500);
    } catch (err) {
      setMessage('프로필 수정에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthGuard>
      <div style={{ minHeight: '100vh', background: '#fff' }}>
        {/* 헤더 */}
        <header style={{ 
          padding: '16px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          borderBottom: '1px solid #eee'
        }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>
            ←
          </button>
          <span style={{ fontSize: '16px', fontWeight: '600' }}>프로필 수정</span>
        </header>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {/* 프로필 이미지 */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: profileImage ? `url(${profileImage}) center/cover` : '#eee',
              margin: '0 auto 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '40px',
            }}>
              {!profileImage && '👤'}
            </div>
            <label style={{
              display: 'inline-block',
              padding: '8px 16px',
              background: '#f5f5f5',
              borderRadius: '20px',
              fontSize: '14px',
              cursor: 'pointer',
            }}>
              사진 변경
              <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
            </label>
          </div>

          {/* 이름 */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
              이름 (닉네임)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                padding: '14px 16px',
                border: '1px solid #ddd',
                borderRadius: '10px',
                fontSize: '16px',
                outline: 'none',
              }}
            />
          </div>

          {/* 이메일 (읽기 전용) */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: '#999' }}>
              이메일
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              style={{
                width: '100%',
                padding: '14px 16px',
                border: '1px solid #eee',
                borderRadius: '10px',
                fontSize: '16px',
                background: '#f9f9f9',
                color: '#999',
              }}
            />
          </div>

          {message && (
            <div style={{
              padding: '12px',
              background: message.includes('실패') ? '#fee2e2' : '#dcfce7',
              color: message.includes('실패') ? '#ef4444' : '#16a34a',
              borderRadius: '8px',
              fontSize: '14px',
              marginBottom: '16px',
              textAlign: 'center',
            }}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '16px',
              background: '#0f62fe',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            {isLoading ? '저장 중...' : '저장하기'}
          </button>
        </form>
      </div>
    </AuthGuard>
  );
}

// src/app/auth/verify-pending/page.tsx
'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
function VerifyPendingContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get('email') || '';
    const [isResending, setIsResending] = useState(false);
    const [message, setMessage] = useState('');
    const handleResend = async () => {
        if (!email) {
            setMessage('이메일 정보가 없습니다.');
            return;
        }
        setIsResending(true);
        setMessage('');
        try {
            await api.post('/auth/resend-verification', { email });
            setMessage('인증 메일이 재발송되었습니다. 이메일을 확인해주세요.');
        }
        catch (error) {
            setMessage(error.response?.data?.message || '잠시 후 다시 시도해주세요.');
        }
        finally {
            setIsResending(false);
        }
    };
    return (<div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f5f5f5',
            padding: 20,
        }}>
      <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: 40,
            maxWidth: 400,
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
        <div style={{
            width: 60,
            height: 60,
            background: '#e8f4ff',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            fontSize: 32,
        }}>
          ✉️
        </div>

        <h1 style={{ fontSize: 22, color: '#333', marginBottom: 8 }}>
          이메일을 확인해주세요
        </h1>

        <p style={{ color: '#666', marginBottom: 8, lineHeight: 1.6 }}>
          회원가입을 완료하려면 이메일 인증이 필요합니다.
        </p>

        {email && (<p style={{
                color: '#0f62fe',
                fontWeight: 600,
                marginBottom: 24,
                wordBreak: 'break-all',
            }}>
            {email}
          </p>)}

        <p style={{ color: '#999', fontSize: 14, marginBottom: 24 }}>
          받은 메일함에서 인증 링크를 클릭해주세요.
          <br />
          스팸함도 확인해보세요.
        </p>

        {message && (<p style={{
                padding: '12px 16px',
                background: message.includes('재발송') ? '#e8f5e9' : '#ffebee',
                color: message.includes('재발송') ? '#2e7d32' : '#c62828',
                borderRadius: 8,
                marginBottom: 24,
                fontSize: 14,
            }}>
            {message}
          </p>)}

        <button onClick={handleResend} disabled={isResending} style={{
            width: '100%',
            padding: '14px',
            background: isResending ? '#ccc' : '#0f62fe',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: isResending ? 'default' : 'pointer',
            fontWeight: 600,
            marginBottom: 16,
        }}>
          {isResending ? '발송 중...' : '인증 메일 재발송'}
        </button>

        <button onClick={() => router.push('/login')} style={{
            width: '100%',
            padding: '14px',
            background: 'transparent',
            color: '#666',
            border: '1px solid #ddd',
            borderRadius: 8,
            cursor: 'pointer',
        }}>
          로그인 페이지로
        </button>
      </div>
    </div>);
}
export default function VerifyPendingPage() {
    return (<Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>로딩 중...</div>}>
      <VerifyPendingContent />
    </Suspense>);
}

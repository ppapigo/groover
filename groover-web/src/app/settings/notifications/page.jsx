// src/app/settings/notifications/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/auth/AuthGuard';
import api from '@/lib/api';
export default function NotificationSettingsPage() {
    const router = useRouter();
    const [settings, setSettings] = useState({
        pushEnabled: true,
        emailEnabled: true,
        adProposals: true,
        messages: true,
        likes: true,
        comments: true,
        marketing: false,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    useEffect(() => {
        fetchSettings();
    }, []);
    const fetchSettings = async () => {
        try {
            const res = await api.get('/users/me/notifications');
            setSettings(res.data.data || res.data);
        }
        catch (err) {
            console.error('알림 설정 불러오기 실패:', err);
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleToggle = async (key) => {
        const newSettings = { ...settings, [key]: !settings[key] };
        setSettings(newSettings);
        setIsSaving(true);
        try {
            await api.put('/users/me/notifications', newSettings);
        }
        catch (err) {
            console.error('알림 설정 저장 실패:', err);
            // 실패 시 롤백
            setSettings(settings);
            alert('설정 변경에 실패했습니다.');
        }
        finally {
            setIsSaving(false);
        }
    };
    const ToggleSwitch = ({ enabled, onToggle, disabled }) => (<button onClick={onToggle} disabled={disabled} style={{
            width: '50px',
            height: '28px',
            borderRadius: '14px',
            border: 'none',
            background: enabled ? '#22c55e' : '#ccc',
            position: 'relative',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
            opacity: disabled ? 0.6 : 1,
        }}>
      <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: '#fff',
            position: 'absolute',
            top: '2px',
            left: enabled ? '24px' : '2px',
            transition: 'left 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}/>
    </button>);
    if (isLoading) {
        return (<AuthGuard>
        <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          로딩 중...
        </div>
      </AuthGuard>);
    }
    return (<AuthGuard>
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
          <span style={{ fontSize: '16px', fontWeight: '600' }}>알림 설정</span>
        </header>

        <div style={{ padding: '16px' }}>
          {/* 전체 알림 */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '13px', color: '#999', marginBottom: '8px', paddingLeft: '4px' }}>
              전체 알림
            </h3>
            <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderBottom: '1px solid #eee' }}>
                <div>
                  <span style={{ fontSize: '15px' }}>푸시 알림</span>
                  <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>앱 알림 받기</p>
                </div>
                <ToggleSwitch enabled={settings.pushEnabled} onToggle={() => handleToggle('pushEnabled')} disabled={isSaving}/>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px' }}>
                <div>
                  <span style={{ fontSize: '15px' }}>이메일 알림</span>
                  <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>이메일로 알림 받기</p>
                </div>
                <ToggleSwitch enabled={settings.emailEnabled} onToggle={() => handleToggle('emailEnabled')} disabled={isSaving}/>
              </div>
            </div>
          </div>

          {/* 활동 알림 */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '13px', color: '#999', marginBottom: '8px', paddingLeft: '4px' }}>
              활동 알림
            </h3>
            <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderBottom: '1px solid #eee' }}>
                <div>
                  <span style={{ fontSize: '15px' }}>광고 제안</span>
                  <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>새로운 광고 제안 알림</p>
                </div>
                <ToggleSwitch enabled={settings.adProposals} onToggle={() => handleToggle('adProposals')} disabled={isSaving}/>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderBottom: '1px solid #eee' }}>
                <div>
                  <span style={{ fontSize: '15px' }}>메시지</span>
                  <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>새로운 메시지 알림</p>
                </div>
                <ToggleSwitch enabled={settings.messages} onToggle={() => handleToggle('messages')} disabled={isSaving}/>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderBottom: '1px solid #eee' }}>
                <div>
                  <span style={{ fontSize: '15px' }}>좋아요</span>
                  <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>내 글에 좋아요 알림</p>
                </div>
                <ToggleSwitch enabled={settings.likes} onToggle={() => handleToggle('likes')} disabled={isSaving}/>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px' }}>
                <div>
                  <span style={{ fontSize: '15px' }}>댓글</span>
                  <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>내 글에 댓글 알림</p>
                </div>
                <ToggleSwitch enabled={settings.comments} onToggle={() => handleToggle('comments')} disabled={isSaving}/>
              </div>
            </div>
          </div>

          {/* 마케팅 알림 */}
          <div>
            <h3 style={{ fontSize: '13px', color: '#999', marginBottom: '8px', paddingLeft: '4px' }}>
              마케팅
            </h3>
            <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px' }}>
                <div>
                  <span style={{ fontSize: '15px' }}>마케팅 정보 수신</span>
                  <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>이벤트, 프로모션 정보</p>
                </div>
                <ToggleSwitch enabled={settings.marketing} onToggle={() => handleToggle('marketing')} disabled={isSaving}/>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>);
}

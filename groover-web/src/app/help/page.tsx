// src/app/help/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface FAQ {
  question: string;
  answer: string;
}

export default function HelpPage() {
  const router = useRouter();
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  const faqs: FAQ[] = [
    {
      question: '회원가입은 어떻게 하나요?',
      answer: '앱 실행 후 "회원가입" 버튼을 눌러 이메일과 비밀번호를 입력하면 가입이 완료됩니다. Google 계정으로도 간편하게 가입할 수 있습니다.',
    },
    {
      question: '비밀번호를 잊어버렸어요.',
      answer: '로그인 화면에서 "비밀번호를 잊으셨나요?"를 눌러 이메일로 비밀번호 재설정 링크를 받을 수 있습니다.',
    },
    {
      question: '글 작성은 어떻게 하나요?',
      answer: '하단 탭에서 + 버튼을 눌러 글을 작성할 수 있습니다. 제목과 내용을 입력하고 발행하면 다른 사용자들이 볼 수 있습니다.',
    },
    {
      question: '게시글을 수정/삭제하고 싶어요.',
      answer: '내 프로필 > 내가 쓴 글에서 수정 또는 삭제할 수 있습니다. 또는 게시글 상세 화면에서 우측 상단 메뉴를 통해 수정/삭제가 가능합니다.',
    },
    {
      question: '광고 제안은 어떻게 받나요?',
      answer: '일정 수준의 팔로워와 활동량이 있으면 광고주로부터 제안을 받을 수 있습니다. 대시보드에서 제안을 확인하고 수락/거절할 수 있습니다.',
    },
    {
      question: '수익은 어떻게 정산되나요?',
      answer: '광고 수익은 에스크로 방식으로 안전하게 보관되며, 광고주가 컨텐츠를 승인하면 정산됩니다. 정산금은 등록된 계좌로 출금 신청할 수 있습니다.',
    },
  ];

  const contactMethods = [
    { icon: '📧', label: '이메일 문의', value: 'support@groover.com' },
    { icon: '💬', label: '카카오톡 채널', value: '@groover' },
    { icon: '📞', label: '전화 문의', value: '1588-0000 (평일 10-18시)' },
  ];

  return (
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
        <span style={{ fontSize: '16px', fontWeight: '600' }}>고객센터</span>
      </header>

      <div style={{ padding: '16px' }}>
        {/* FAQ */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '13px', color: '#999', marginBottom: '8px', paddingLeft: '4px' }}>
            자주 묻는 질문
          </h3>
          <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden' }}>
            {faqs.map((faq, idx) => (
              <div key={idx} style={{ borderBottom: idx < faqs.length - 1 ? '1px solid #eee' : 'none' }}>
                <button
                  onClick={() => setOpenFAQ(openFAQ === idx ? null : idx)}
                  style={{
                    width: '100%',
                    padding: '16px',
                    background: 'none',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: '15px', fontWeight: '500' }}>{faq.question}</span>
                  <span style={{ color: '#999', transform: openFAQ === idx ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                    ▼
                  </span>
                </button>
                {openFAQ === idx && (
                  <div style={{ padding: '0 16px 16px', fontSize: '14px', color: '#666', lineHeight: 1.6 }}>
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 문의하기 */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '13px', color: '#999', marginBottom: '8px', paddingLeft: '4px' }}>
            문의하기
          </h3>
          <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden' }}>
            {contactMethods.map((method, idx) => (
              <div
                key={idx}
                style={{
                  padding: '16px',
                  borderBottom: idx < contactMethods.length - 1 ? '1px solid #eee' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <span style={{ fontSize: '20px' }}>{method.icon}</span>
                <div>
                  <div style={{ fontSize: '14px', color: '#999', marginBottom: '2px' }}>{method.label}</div>
                  <div style={{ fontSize: '15px', fontWeight: '500' }}>{method.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 1:1 문의 */}
        <Link
          href="/help/inquiry"
          style={{
            display: 'block',
            padding: '16px',
            background: '#0f62fe',
            color: '#fff',
            borderRadius: '12px',
            textAlign: 'center',
            fontSize: '16px',
            fontWeight: '600',
            textDecoration: 'none',
          }}
        >
          1:1 문의하기
        </Link>
      </div>
    </div>
  );
}

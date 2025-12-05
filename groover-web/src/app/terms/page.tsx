// src/app/terms/page.tsx
'use client';

import { useRouter } from 'next/navigation';

export default function TermsPage() {
  const router = useRouter();

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      {/* 헤더 */}
      <header style={{ 
        padding: '16px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px',
        borderBottom: '1px solid #eee',
        position: 'sticky',
        top: 0,
        background: '#fff',
        zIndex: 10,
      }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>
          ←
        </button>
        <span style={{ fontSize: '16px', fontWeight: '600' }}>이용약관</span>
      </header>

      <div style={{ padding: '24px', fontSize: '14px', lineHeight: 1.8, color: '#333' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Groover 서비스 이용약관</h2>
        
        <p style={{ color: '#999', marginBottom: '24px' }}>시행일: 2024년 1월 1일</p>

        <section style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>제1조 (목적)</h3>
          <p>
            이 약관은 Groover(이하 "회사")가 제공하는 쇼핑 블로그 플랫폼 서비스(이하 "서비스")의 
            이용 조건 및 절차, 회사와 회원 간의 권리, 의무 및 책임 사항을 규정함을 목적으로 합니다.
          </p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>제2조 (정의)</h3>
          <p>① "서비스"란 회사가 제공하는 쇼핑 리뷰 및 블로그 플랫폼을 의미합니다.</p>
          <p>② "회원"이란 서비스에 가입하여 이용하는 자를 말합니다.</p>
          <p>③ "콘텐츠"란 회원이 서비스에 게시한 글, 사진, 동영상 등을 말합니다.</p>
          <p>④ "광고주"란 크리에이터에게 광고를 의뢰하는 사업자를 말합니다.</p>
          <p>⑤ "크리에이터"란 광고 콘텐츠를 제작하는 회원을 말합니다.</p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>제3조 (약관의 효력)</h3>
          <p>
            ① 이 약관은 서비스 화면에 게시하거나 기타의 방법으로 회원에게 공지함으로써 효력이 발생합니다.
          </p>
          <p>
            ② 회사는 필요한 경우 관련 법령을 위배하지 않는 범위에서 이 약관을 개정할 수 있습니다.
          </p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>제4조 (회원가입)</h3>
          <p>① 회원가입은 이용자가 약관에 동의하고 가입 신청을 하면 회사가 승낙함으로써 완료됩니다.</p>
          <p>② 회사는 다음 각 호에 해당하는 경우 가입을 거절할 수 있습니다.</p>
          <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
            <li>타인의 명의를 이용한 경우</li>
            <li>허위 정보를 기재한 경우</li>
            <li>기타 회사가 정한 가입 요건을 충족하지 못한 경우</li>
          </ul>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>제5조 (서비스 이용)</h3>
          <p>① 서비스는 회사의 업무상 또는 기술상 특별한 지장이 없는 한 연중무휴, 24시간 제공됩니다.</p>
          <p>② 회사는 서비스 개선을 위해 사전 공지 후 서비스를 일시 중단할 수 있습니다.</p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>제6조 (회원의 의무)</h3>
          <p>회원은 다음 행위를 하여서는 안 됩니다.</p>
          <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
            <li>타인의 정보 도용</li>
            <li>허위 정보 게시</li>
            <li>회사의 지적재산권 침해</li>
            <li>다른 회원에 대한 비방, 명예훼손</li>
            <li>음란물, 불법 정보 게시</li>
            <li>직거래 유도 및 플랫폼 우회 거래</li>
          </ul>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>제7조 (광고 및 수익)</h3>
          <p>① 광고주와 크리에이터 간의 광고 거래는 에스크로 방식으로 진행됩니다.</p>
          <p>② 회사는 광고 수익의 일정 비율을 수수료로 수취합니다.</p>
          <p>③ 정산은 광고주의 승인 후 진행되며, 출금은 등록된 계좌로만 가능합니다.</p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>제8조 (면책조항)</h3>
          <p>① 회사는 회원 간 또는 회원과 제3자 간의 분쟁에 개입하지 않습니다.</p>
          <p>② 회사는 천재지변, 전쟁 등 불가항력으로 인한 서비스 중단에 책임을 지지 않습니다.</p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>제9조 (분쟁해결)</h3>
          <p>이 약관과 관련된 분쟁은 대한민국 법령에 따르며, 관할 법원은 회사 소재지 법원으로 합니다.</p>
        </section>

        <p style={{ color: '#999', marginTop: '40px', textAlign: 'center' }}>
          본 약관은 2024년 1월 1일부터 적용됩니다.
        </p>
      </div>
    </div>
  );
}

// src/app/privacy/page.tsx
'use client';
import { useRouter } from 'next/navigation';
export default function PrivacyPage() {
    const router = useRouter();
    return (<div style={{ minHeight: '100vh', background: '#fff' }}>
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
        <span style={{ fontSize: '16px', fontWeight: '600' }}>개인정보처리방침</span>
      </header>

      <div style={{ padding: '24px', fontSize: '14px', lineHeight: 1.8, color: '#333' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>개인정보처리방침</h2>
        
        <p style={{ color: '#999', marginBottom: '24px' }}>시행일: 2024년 1월 1일</p>

        <p style={{ marginBottom: '24px' }}>
          Groover(이하 "회사")는 개인정보보호법 등 관련 법령에 따라 이용자의 개인정보를 
          보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 다음과 같이 
          개인정보처리방침을 수립·공개합니다.
        </p>

        <section style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>1. 수집하는 개인정보</h3>
          <p>회사는 다음과 같은 개인정보를 수집합니다.</p>
          <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
            <li><strong>필수항목:</strong> 이메일, 비밀번호, 이름(닉네임)</li>
            <li><strong>선택항목:</strong> 프로필 사진, 소개글</li>
            <li><strong>자동수집:</strong> 접속 IP, 쿠키, 접속 기록, 기기 정보</li>
            <li><strong>결제 시:</strong> 계좌번호, 예금주명 (정산 목적)</li>
          </ul>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>2. 개인정보 수집 방법</h3>
          <ul style={{ marginLeft: '20px' }}>
            <li>회원가입 시 직접 입력</li>
            <li>소셜 로그인(Google) 연동</li>
            <li>서비스 이용 과정에서 자동 생성</li>
            <li>고객센터 문의 시</li>
          </ul>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>3. 개인정보 이용 목적</h3>
          <ul style={{ marginLeft: '20px' }}>
            <li>서비스 제공 및 회원 관리</li>
            <li>콘텐츠 제공 및 맞춤 서비스</li>
            <li>광고 거래 및 정산</li>
            <li>서비스 개선 및 통계 분석</li>
            <li>불법 이용 방지 및 분쟁 해결</li>
          </ul>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>4. 개인정보 보유 기간</h3>
          <p>회원 탈퇴 시 지체 없이 파기합니다. 단, 다음의 경우 명시한 기간 동안 보관합니다.</p>
          <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
            <li>계약/청약철회 기록: 5년 (전자상거래법)</li>
            <li>대금결제/재화공급 기록: 5년 (전자상거래법)</li>
            <li>소비자 불만/분쟁처리 기록: 3년 (전자상거래법)</li>
            <li>접속 기록: 3개월 (통신비밀보호법)</li>
          </ul>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>5. 개인정보 제3자 제공</h3>
          <p>회사는 원칙적으로 개인정보를 외부에 제공하지 않습니다. 다만, 다음의 경우 예외로 합니다.</p>
          <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
            <li>이용자가 사전에 동의한 경우</li>
            <li>법령에 의해 요구되는 경우</li>
            <li>광고 거래 시 상대방에게 필요 최소한의 정보 제공 (이름, 연락처)</li>
          </ul>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>6. 개인정보 파기</h3>
          <p>
            개인정보 보유 기간이 경과하거나 처리 목적이 달성된 경우, 
            해당 개인정보를 지체 없이 파기합니다.
          </p>
          <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
            <li>전자적 파일: 복구 불가능한 방법으로 영구 삭제</li>
            <li>서면: 분쇄 또는 소각</li>
          </ul>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>7. 이용자의 권리</h3>
          <p>이용자는 다음과 같은 권리를 행사할 수 있습니다.</p>
          <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
            <li>개인정보 열람 요구</li>
            <li>개인정보 정정·삭제 요구</li>
            <li>개인정보 처리 정지 요구</li>
            <li>회원 탈퇴</li>
          </ul>
          <p style={{ marginTop: '8px' }}>
            권리 행사는 설정 메뉴 또는 고객센터를 통해 가능합니다.
          </p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>8. 쿠키 사용</h3>
          <p>
            회사는 서비스 이용 편의를 위해 쿠키를 사용합니다. 
            브라우저 설정을 통해 쿠키 저장을 거부할 수 있으나, 
            일부 서비스 이용에 제한이 있을 수 있습니다.
          </p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>9. 개인정보보호책임자</h3>
          <div style={{ background: '#f5f5f5', padding: '16px', borderRadius: '8px' }}>
            <p><strong>개인정보보호책임자</strong></p>
            <p>이름: 홍길동</p>
            <p>이메일: privacy@groover.com</p>
            <p>전화: 02-1234-5678</p>
          </div>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>10. 권익침해 구제방법</h3>
          <p>개인정보 침해에 대한 신고나 상담은 아래 기관에 문의하실 수 있습니다.</p>
          <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
            <li>개인정보침해신고센터: privacy.kisa.or.kr / 118</li>
            <li>개인정보분쟁조정위원회: kopico.go.kr / 1833-6972</li>
            <li>대검찰청 사이버범죄수사단: spo.go.kr / 1301</li>
            <li>경찰청 사이버안전국: cyberbureau.police.go.kr / 182</li>
          </ul>
        </section>

        <p style={{ color: '#999', marginTop: '40px', textAlign: 'center' }}>
          본 방침은 2024년 1월 1일부터 적용됩니다.
        </p>
      </div>
    </div>);
}

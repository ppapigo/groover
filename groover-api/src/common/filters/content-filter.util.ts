// src/common/filters/content-filter.util.ts

export interface FilterResult {
  isBlocked: boolean;
  filteredContent: string;
  detectedPatterns: string[];
  detectedTypes: string[];
}

const BLOCKED_PATTERNS: { pattern: RegExp; type: string }[] = [
  // 계좌번호
  { pattern: /\d{3,4}[-\s]?\d{2,4}[-\s]?\d{4,7}/g, type: 'BANK_ACCOUNT' },
  
  // 전화번호
  { pattern: /01[0-9][-.\s]?\d{3,4}[-.\s]?\d{4}/g, type: 'PHONE_NUMBER' },
  
  // 카카오톡
  { pattern: /카[카톡오]\s*[:=]?\s*[a-zA-Z0-9_]{2,20}/gi, type: 'KAKAO_ID' },
  { pattern: /오픈\s*채팅/gi, type: 'KAKAO_OPENCHAT' },
  { pattern: /open\.kakao\.com\/[a-zA-Z0-9\/]+/gi, type: 'KAKAO_LINK' },
  
  // 텔레그램
  { pattern: /텔레그램\s*[:=]?\s*@?[a-zA-Z0-9_]{2,30}/gi, type: 'TELEGRAM' },
  { pattern: /t\.me\/[a-zA-Z0-9_]+/gi, type: 'TELEGRAM_LINK' },
  
  // 이메일
  { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, type: 'EMAIL' },
  
  // 외부 URL
  { pattern: /https?:\/\/(?!.*groover)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s]*/gi, type: 'EXTERNAL_URL' },
  
  // 직거래 키워드
  { pattern: /계좌\s*(번호|입금|송금)/gi, type: 'BANK_KEYWORD' },
  { pattern: /(입금|송금)\s*(해|하|부탁)/gi, type: 'TRANSFER_REQUEST' },
  { pattern: /직거래/gi, type: 'DIRECT_TRADE' },
];

export function filterContent(content: string): FilterResult {
  const detectedPatterns: string[] = [];
  const detectedTypes: string[] = [];
  let filteredContent = content;
  let isBlocked = false;

  for (const { pattern, type } of BLOCKED_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    const matches = content.match(regex);

    if (matches && matches.length > 0) {
      isBlocked = true;
      detectedPatterns.push(...matches);
      
      if (!detectedTypes.includes(type)) {
        detectedTypes.push(type);
      }

      filteredContent = filteredContent.replace(regex, '[차단됨]');
    }
  }

  return {
    isBlocked,
    filteredContent,
    detectedPatterns: [...new Set(detectedPatterns)],
    detectedTypes,
  };
}

export function getBlockedMessage(): string {
  return '안전결제 보호를 위해 외부 연락처 공유가 제한됩니다. 모든 광고비 결제는 Groover를 통해 진행해주세요.';
}

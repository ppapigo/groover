// src/blog/services/disclaimer.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type AffiliateSource = 'coupang' | 'naver' | 'internal';
type Locale = 'ko' | 'en' | 'ja' | 'zh';

interface DisclaimerTemplate {
  [locale: string]: {
    [source: string]: string;
  };
}

@Injectable()
export class DisclaimerService {
  private readonly locale: Locale;

  // 지역별/플랫폼별 협찬 문구 템플릿
  private readonly templates: DisclaimerTemplate = {
    ko: {
      coupang: '※ 본 게시물은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수익을 제공받을 수 있습니다.',
      naver: '※ 이 글은 네이버 쇼핑 파트너스 링크를 포함하며, 구매 시 일정 수익이 발생할 수 있습니다.',
      internal: '', // 내부 상품은 협찬 문구 불필요
    },
    en: {
      coupang: '※ This post contains affiliate links. We may earn a commission from qualifying purchases.',
      naver: '※ This post contains affiliate links. We may earn a commission from qualifying purchases.',
      internal: '',
    },
    ja: {
      coupang: '※ この投稿にはアフィリエイトリンクが含まれています。購入により報酬が発生する場合があります。',
      naver: '※ この投稿にはアフィリエイトリンクが含まれています。購入により報酬が発生する場合があります。',
      internal: '',
    },
    zh: {
      coupang: '※ 本文包含联盟营销链接，购买可能会产生佣金。',
      naver: '※ 本文包含联盟营销链接，购买可能会产生佣金。',
      internal: '',
    },
  };

  // 협찬 문구 구분자 (삭제 방지용 마커)
  private readonly DISCLAIMER_START = '<!-- GROOVER_DISCLAIMER_START -->';
  private readonly DISCLAIMER_END = '<!-- GROOVER_DISCLAIMER_END -->';

  constructor(private readonly configService: ConfigService) {
    this.locale = (this.configService.get('LOCALE') as Locale) || 'ko';
  }

  /**
   * 본문에 협찬 문구 추가
   * - 이미 있으면 업데이트
   * - 없으면 하단에 추가
   */
  appendDisclaimer(content: string, sources: AffiliateSource[]): string {
    // 내부 상품만 있으면 협찬 문구 불필요
    const affiliateSources = sources.filter(s => s !== 'internal');
    if (affiliateSources.length === 0) {
      return this.removeDisclaimer(content);
    }

    // 협찬 문구 생성
    const disclaimerHtml = this.generateDisclaimerHtml(affiliateSources);

    // 기존 협찬 문구 제거 후 새로 추가
    const cleanContent = this.removeDisclaimer(content);
    
    return `${cleanContent}\n\n${disclaimerHtml}`;
  }

  /**
   * 협찬 문구 제거
   */
  removeDisclaimer(content: string): string {
    const regex = new RegExp(
      `${this.escapeRegex(this.DISCLAIMER_START)}[\\s\\S]*?${this.escapeRegex(this.DISCLAIMER_END)}`,
      'g'
    );
    return content.replace(regex, '').trim();
  }

  /**
   * 협찬 문구 HTML 생성
   */
  private generateDisclaimerHtml(sources: AffiliateSource[]): string {
    const disclaimers = sources
      .map(source => this.templates[this.locale]?.[source] || this.templates.ko[source])
      .filter(d => d && d.length > 0);

    if (disclaimers.length === 0) {
      return '';
    }

    // 중복 제거
    const uniqueDisclaimers = [...new Set(disclaimers)];

    const disclaimerText = uniqueDisclaimers.join('\n');

    return `${this.DISCLAIMER_START}
<div class="groover-disclaimer" style="margin-top: 40px; padding: 16px; background-color: #f8f9fa; border-radius: 8px; font-size: 12px; color: #6c757d; line-height: 1.6;">
${uniqueDisclaimers.map(d => `<p style="margin: 4px 0;">${d}</p>`).join('\n')}
</div>
${this.DISCLAIMER_END}`;
  }

  /**
   * 협찬 문구가 있는지 확인
   */
  hasDisclaimer(content: string): boolean {
    return content.includes(this.DISCLAIMER_START);
  }

  /**
   * 협찬 문구를 표시할 때 사용 (API 응답용)
   */
  getDisclaimerForDisplay(sources: AffiliateSource[]): string[] {
    const affiliateSources = sources.filter(s => s !== 'internal');
    
    return affiliateSources
      .map(source => this.templates[this.locale]?.[source] || this.templates.ko[source])
      .filter(d => d && d.length > 0);
  }

  /**
   * 정규식 이스케이프
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * 지역 설정 변경
   */
  setLocale(locale: Locale): void {
    (this as any).locale = locale;
  }
}

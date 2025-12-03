// src/dm/services/link-preview.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface LinkPreview {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  favicon: string | null;
}

// 이미지 URL 허용 도메인 (보안)
const ALLOWED_IMAGE_DOMAINS = [
  'images.unsplash.com',
  'i.imgur.com',
  'pbs.twimg.com',
  'instagram.com',
  'cdn.shopify.com',
  's3.amazonaws.com',
  'cloudfront.net',
  'googleusercontent.com',
  'fbcdn.net',
  'naver.net',
  'kakaocdn.net',
  'coupangcdn.com',
];

@Injectable()
export class LinkPreviewService {
  private readonly logger = new Logger(LinkPreviewService.name);

  constructor(private readonly httpService: HttpService) {}

  /**
   * URL에서 미리보기 정보 추출
   */
  async getPreview(url: string): Promise<LinkPreview | null> {
    try {
      // URL 유효성 검사
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return null;
      }

      // 페이지 가져오기
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; GrooverBot/1.0)',
            'Accept': 'text/html',
          },
          timeout: 5000,
          maxRedirects: 3,
        })
      );

      const html = response.data;

      // Open Graph 메타 태그 파싱
      const preview = this.parseOpenGraph(html, url);

      // 이미지 URL 검증
      if (preview.image) {
        preview.image = this.validateImageUrl(preview.image);
      }

      return preview;

    } catch (error) {
      this.logger.warn(`Failed to get preview for ${url}: ${error.message}`);
      return null;
    }
  }

  /**
   * Open Graph 메타 태그 파싱
   */
  private parseOpenGraph(html: string, originalUrl: string): LinkPreview {
    const getMetaContent = (property: string): string | null => {
      // og:property 형식
      const ogMatch = html.match(
        new RegExp(`<meta[^>]+property=["']og:${property}["'][^>]+content=["']([^"']+)["']`, 'i')
      );
      if (ogMatch) return ogMatch[1];

      // content가 먼저 오는 경우
      const ogMatch2 = html.match(
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${property}["']`, 'i')
      );
      if (ogMatch2) return ogMatch2[1];

      // twitter:property 형식
      const twitterMatch = html.match(
        new RegExp(`<meta[^>]+name=["']twitter:${property}["'][^>]+content=["']([^"']+)["']`, 'i')
      );
      if (twitterMatch) return twitterMatch[1];

      return null;
    };

    // title 태그
    const titleTagMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const titleTag = titleTagMatch ? titleTagMatch[1].trim() : null;

    // description 메타 태그
    const descMatch = html.match(
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i
    );
    const descTag = descMatch ? descMatch[1] : null;

    // favicon
    const faviconMatch = html.match(
      /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i
    );
    let favicon = faviconMatch ? faviconMatch[1] : null;
    if (favicon && !favicon.startsWith('http')) {
      const baseUrl = new URL(originalUrl);
      favicon = new URL(favicon, baseUrl.origin).href;
    }

    return {
      url: originalUrl,
      title: getMetaContent('title') || titleTag,
      description: getMetaContent('description') || descTag,
      image: getMetaContent('image'),
      siteName: getMetaContent('site_name'),
      favicon,
    };
  }

  /**
   * 이미지 URL 검증 (보안)
   */
  private validateImageUrl(imageUrl: string | null): string | null {
    if (!imageUrl) return null;

    try {
      const url = new URL(imageUrl);
      
      // HTTPS만 허용
      if (url.protocol !== 'https:') {
        return null;
      }

      // 도메인 화이트리스트 체크 (선택적)
      // const isAllowed = ALLOWED_IMAGE_DOMAINS.some(domain => 
      //   url.hostname.endsWith(domain)
      // );
      // if (!isAllowed) return null;

      return imageUrl;
    } catch {
      return null;
    }
  }

  /**
   * 텍스트에서 URL 추출
   */
  extractUrls(text: string): string[] {
    const urlRegex = /https?:\/\/[^\s<>"']+/gi;
    return text.match(urlRegex) || [];
  }

  /**
   * 메시지에서 첫 번째 URL 미리보기 생성
   */
  async getPreviewForMessage(content: string): Promise<LinkPreview | null> {
    const urls = this.extractUrls(content);
    if (urls.length === 0) return null;

    return this.getPreview(urls[0]);
  }
}

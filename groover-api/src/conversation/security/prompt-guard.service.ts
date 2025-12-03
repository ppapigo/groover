// src/conversation/security/prompt-guard.service.ts
import { Injectable, BadRequestException, Logger } from '@nestjs/common';

@Injectable()
export class PromptGuardService {
  private readonly logger = new Logger(PromptGuardService.name);

  // ============================================
  // 금지 패턴 (Prompt Injection 방어)
  // ============================================
  private readonly BLOCKED_PATTERNS: RegExp[] = [
    // 영어 패턴
    /ignore\s+(previous|above|all|prior)\s+(instructions?|prompts?|commands?)/i,
    /disregard\s+(previous|above|all|prior)/i,
    /forget\s+(everything|all|previous)/i,
    /override\s+(previous|system)/i,
    /bypass\s+(security|filter|restriction)/i,
    /system\s*prompt/i,
    /reveal\s*(your|the)?\s*(instructions?|prompts?|system)/i,
    /what\s*(are|is)\s*your\s*(instructions?|prompts?|rules?)/i,
    /show\s*(me)?\s*(your)?\s*(system|hidden|secret)/i,
    /jailbreak/i,
    /DAN\s*mode/i,
    /developer\s*mode/i,
    /pretend\s*(you('re)?|to\s*be)/i,
    /act\s*as\s*(a|an)?\s*(hacker|admin|root|developer)/i,
    /you\s*are\s*now/i,
    /new\s*persona/i,
    /roleplay\s*as/i,
    /sudo\s+/i,
    /admin\s*access/i,
    /execute\s*(code|command|script)/i,
    /run\s*(this)?\s*(code|command|script)/i,
    /eval\s*\(/i,
    /import\s+os/i,
    /require\s*\(/i,
    /__proto__/i,
    /constructor\s*\[/i,

    // 한국어 패턴
    /이전\s*(지시|명령|프롬프트|규칙).*무시/i,
    /시스템\s*프롬프트/i,
    /숨겨진\s*(명령|지시|규칙)/i,
    /너는\s*이제부터/i,
    /너의\s*역할을?\s*바꿔/i,
    /관리자\s*(모드|권한)/i,
    /해킹|해커/i,
    /모든\s*(데이터|정보)\s*(출력|보여)/i,
    /비밀\s*(정보|키|번호)/i,
    /API\s*(키|key)/i,
    /데이터베이스\s*(접근|삭제)/i,
    /사용자\s*(목록|정보)\s*(전체|모두)/i,

    // SQL/코드 인젝션 패턴
    /drop\s+table/i,
    /delete\s+from/i,
    /truncate\s+table/i,
    /union\s+select/i,
    /;\s*--/i,
    /'\s*or\s*'1'\s*=\s*'1/i,
    /<script>/i,
    /<\/script>/i,
    /javascript:/i,
    /on(click|load|error|mouseover)\s*=/i,
  ];

  // ============================================
  // 허용되지 않는 특수 문자/시퀀스
  // ============================================
  private readonly DANGEROUS_SEQUENCES: string[] = [
    '```system',
    '```python',
    '```javascript',
    '```bash',
    '```shell',
    '{{',
    '}}',
    '${',
    '<|',
    '|>',
    '[INST]',
    '[/INST]',
    '<<SYS>>',
    '<</SYS>>',
  ];

  // ============================================
  // 설정
  // ============================================
  private readonly MAX_LENGTH = 500;
  private readonly MAX_REPEATED_CHARS = 10;  // 같은 문자 반복 제한

  /**
   * 사용자 입력 검증 (메인 메서드)
   */
  validate(input: string): string {
    // 1. null/undefined 체크
    if (!input || typeof input !== 'string') {
      throw new BadRequestException('메시지를 입력해주세요');
    }

    // 2. 길이 체크
    if (input.length > this.MAX_LENGTH) {
      throw new BadRequestException(`메시지가 너무 길어요 (최대 ${this.MAX_LENGTH}자)`);
    }

    // 3. 금지 패턴 체크
    this.checkBlockedPatterns(input);

    // 4. 위험 시퀀스 체크
    this.checkDangerousSequences(input);

    // 5. 반복 문자 체크 (DoS 방지)
    this.checkRepeatedChars(input);

    // 6. Sanitize
    const sanitized = this.sanitize(input);

    // 7. 빈 문자열 체크
    if (sanitized.length === 0) {
      throw new BadRequestException('메시지를 입력해주세요');
    }

    this.logger.debug(`Input validated: ${sanitized.substring(0, 50)}...`);
    return sanitized;
  }

  /**
   * 금지 패턴 체크
   */
  private checkBlockedPatterns(input: string): void {
    for (const pattern of this.BLOCKED_PATTERNS) {
      if (pattern.test(input)) {
        this.logger.warn(`Blocked pattern detected: ${pattern.source}`);
        throw new BadRequestException('허용되지 않는 표현이 포함되어 있어요');
      }
    }
  }

  /**
   * 위험 시퀀스 체크
   */
  private checkDangerousSequences(input: string): void {
    const lowerInput = input.toLowerCase();
    for (const seq of this.DANGEROUS_SEQUENCES) {
      if (lowerInput.includes(seq.toLowerCase())) {
        this.logger.warn(`Dangerous sequence detected: ${seq}`);
        throw new BadRequestException('허용되지 않는 표현이 포함되어 있어요');
      }
    }
  }

  /**
   * 반복 문자 체크
   */
  private checkRepeatedChars(input: string): void {
    const repeatedPattern = new RegExp(`(.)\\1{${this.MAX_REPEATED_CHARS},}`, 'g');
    if (repeatedPattern.test(input)) {
      this.logger.warn('Repeated characters detected');
      throw new BadRequestException('비정상적인 입력이에요');
    }
  }

  /**
   * 입력 Sanitize
   */
  private sanitize(input: string): string {
    return input
      // 제어 문자 제거 (탭, 줄바꿈은 유지)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // NULL 바이트 제거
      .replace(/\0/g, '')
      // 연속 공백 정리
      .replace(/[ \t]+/g, ' ')
      // 연속 줄바꿈 정리 (최대 2개)
      .replace(/\n{3,}/g, '\n\n')
      // 앞뒤 공백 제거
      .trim();
  }

  /**
   * LLM 응답 검증 (출력 필터링)
   */
  validateOutput(output: string): string {
    if (!output || typeof output !== 'string') {
      return '';
    }

    // 민감 정보 패턴
    const sensitivePatterns = [
      /api[_-]?key\s*[:=]\s*['"]?[a-zA-Z0-9-_]+/gi,
      /password\s*[:=]\s*['"]?[^\s'"]+/gi,
      /secret\s*[:=]\s*['"]?[a-zA-Z0-9-_]+/gi,
      /bearer\s+[a-zA-Z0-9._-]+/gi,
      /sk-[a-zA-Z0-9]{20,}/g,  // OpenAI 키
      /sk-ant-[a-zA-Z0-9-]+/g,  // Anthropic 키
      /database_url\s*[:=]/gi,
      /postgres:\/\/[^\s]+/gi,
      /mysql:\/\/[^\s]+/gi,
      /mongodb:\/\/[^\s]+/gi,
    ];

    let result = output;
    let detected = false;

    for (const pattern of sensitivePatterns) {
      if (pattern.test(result)) {
        this.logger.warn(`Sensitive data detected in output: ${pattern.source}`);
        detected = true;
        result = result.replace(pattern, '[REDACTED]');
      }
    }

    if (detected) {
      this.logger.error('Sensitive data was found and redacted from LLM output');
    }

    return result;
  }

  /**
   * JSON 응답 검증
   */
  validateJsonOutput(output: string): any {
    const sanitizedOutput = this.validateOutput(output);

    try {
      // JSON 블록 추출
      const jsonMatch = sanitizedOutput.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return null;
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // 재귀적으로 민감 키 제거
      return this.removeSensitiveKeys(parsed);
    } catch (e) {
      this.logger.warn('Failed to parse JSON output');
      return null;
    }
  }

  /**
   * 민감한 키 제거
   */
  private removeSensitiveKeys(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    const sensitiveKeys = ['password', 'secret', 'apiKey', 'api_key', 'token', 'credential'];

    if (Array.isArray(obj)) {
      return obj.map(item => this.removeSensitiveKeys(item));
    }

    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        continue;  // 민감 키 스킵
      }
      result[key] = this.removeSensitiveKeys(value);
    }

    return result;
  }
}

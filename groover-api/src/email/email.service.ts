// src/email/email.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private readonly fromEmail: string;
  private readonly frontendUrl: string;

  constructor(private configService: ConfigService) {
  this.transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: this.configService.get('GMAIL_USER'),
      pass: this.configService.get('GMAIL_APP_PASSWORD'),
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });

  this.fromEmail = this.configService.get('EMAIL_FROM') || 'noreply@grooverapp.com';
  this.frontendUrl = this.configService.get('FRONTEND_URL') || 'https://www.grooverapp.com';
}
  async sendVerificationEmail(email: string, token: string, name?: string): Promise<boolean> {
    const verifyUrl = `${this.frontendUrl}/auth/verify?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .card { background: #fff; border-radius: 16px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .logo { font-size: 28px; font-weight: bold; color: #0f62fe; margin-bottom: 24px; }
          .title { font-size: 24px; font-weight: 600; color: #333; margin-bottom: 16px; }
          .text { font-size: 16px; color: #666; line-height: 1.6; margin-bottom: 24px; }
          .button { display: inline-block; padding: 14px 32px; background: #0f62fe; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; }
          .button:hover { background: #0043ce; }
          .footer { margin-top: 32px; padding-top: 24px; border-top: 1px solid #eee; font-size: 14px; color: #999; }
          .link { color: #0f62fe; word-break: break-all; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="logo">🛒 Groover</div>
            <div class="title">이메일 인증을 완료해주세요</div>
            <div class="text">
              안녕하세요${name ? ` ${name}` : ''}님!<br><br>
              Groover에 가입해 주셔서 감사합니다.<br>
              아래 버튼을 클릭하여 이메일 인증을 완료해주세요.
            </div>
            <a href="${verifyUrl}" class="button">이메일 인증하기</a>
            <div class="footer">
              버튼이 작동하지 않으면 아래 링크를 브라우저에 직접 붙여넣어주세요:<br>
              <a href="${verifyUrl}" class="link">${verifyUrl}</a><br><br>
              이 링크는 24시간 동안 유효합니다.<br>
              본인이 가입하지 않으셨다면 이 메일을 무시해주세요.
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Groover 이메일 인증

안녕하세요${name ? ` ${name}` : ''}님!

Groover에 가입해 주셔서 감사합니다.
아래 링크를 클릭하여 이메일 인증을 완료해주세요:

${verifyUrl}

이 링크는 24시간 동안 유효합니다.
본인이 가입하지 않으셨다면 이 메일을 무시해주세요.
    `;

    try {
      await this.transporter.sendMail({
        from: `"Groover" <${this.configService.get('GMAIL_USER')}>`,
        to: email,
        subject: '[Groover] 이메일 인증을 완료해주세요',
        text,
        html,
      });

      this.logger.log(`인증 이메일 발송 완료: ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`이메일 발송 실패: ${email}`, error);
      return false;
    }
  }

  async sendPasswordResetEmail(email: string, token: string, name?: string): Promise<boolean> {
    const resetUrl = `${this.frontendUrl}/auth/reset-password?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .card { background: #fff; border-radius: 16px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .logo { font-size: 28px; font-weight: bold; color: #0f62fe; margin-bottom: 24px; }
          .title { font-size: 24px; font-weight: 600; color: #333; margin-bottom: 16px; }
          .text { font-size: 16px; color: #666; line-height: 1.6; margin-bottom: 24px; }
          .button { display: inline-block; padding: 14px 32px; background: #0f62fe; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; }
          .footer { margin-top: 32px; padding-top: 24px; border-top: 1px solid #eee; font-size: 14px; color: #999; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="logo">🛒 Groover</div>
            <div class="title">비밀번호 재설정</div>
            <div class="text">
              안녕하세요${name ? ` ${name}` : ''}님!<br><br>
              비밀번호 재설정 요청을 받았습니다.<br>
              아래 버튼을 클릭하여 새 비밀번호를 설정해주세요.
            </div>
            <a href="${resetUrl}" class="button">비밀번호 재설정</a>
            <div class="footer">
              이 링크는 1시간 동안 유효합니다.<br>
              본인이 요청하지 않으셨다면 이 메일을 무시해주세요.
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await this.transporter.sendMail({
        from: `"Groover" <${this.configService.get('GMAIL_USER')}>`,
        to: email,
        subject: '[Groover] 비밀번호 재설정',
        html,
      });

      this.logger.log(`비밀번호 재설정 이메일 발송: ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`이메일 발송 실패: ${email}`, error);
      return false;
    }
  }
}
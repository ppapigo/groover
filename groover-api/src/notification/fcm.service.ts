import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    try {
      const serviceAccountPath = path.join(
        process.cwd(),
        'groover-2d5af-firebase-adminsdk-fbsvc-0723e1c04c.json',
      );
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccountPath),
      });
      this.logger.log('Firebase Admin initialized');
    } catch (error) {
      this.logger.error('Firebase Admin init error:', error);
    }
  }

  async saveToken(userId: string, token: string, device?: string) {
    return this.prisma.fcmToken.upsert({
      where: { userId_token: { userId, token } },
      update: { updatedAt: new Date(), device: device || 'web' },
      create: { userId, token, device: device || 'web' },
    });
  }

  async removeToken(userId: string, token: string) {
    return this.prisma.fcmToken.deleteMany({ where: { userId, token } });
  }

  async sendToUser(userId: string, title: string, body: string, data?: Record<string, string>) {
    const tokens = await this.prisma.fcmToken.findMany({
      where: { userId },
      select: { token: true },
    });
    if (tokens.length === 0) return { success: false, reason: 'no_tokens' };
    return this.sendToTokens(tokens.map(t => t.token), title, body, data);
  }

  async sendToTokens(tokens: string[], title: string, body: string, data?: Record<string, string>) {
    if (tokens.length === 0) return { success: false, reason: 'no_tokens' };

    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: { title, body },
      data: data || {},
      webpush: {
        fcmOptions: { link: data?.link || '/' },
        notification: { icon: '/icon-192x192.png' },
      },
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      this.logger.log(`FCM: ${response.successCount} success, ${response.failureCount} failed`);

      if (response.failureCount > 0) {
        const failedTokens = response.responses
          .map((resp, idx) => (!resp.success ? tokens[idx] : null))
          .filter(Boolean) as string[];
        if (failedTokens.length > 0) {
          await this.prisma.fcmToken.deleteMany({ where: { token: { in: failedTokens } } });
        }
      }
      return { success: true, successCount: response.successCount, failureCount: response.failureCount };
    } catch (error) {
      this.logger.error('FCM send error:', error);
      return { success: false, error: error.message };
    }
  }
}
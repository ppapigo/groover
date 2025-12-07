// src/notification/notification.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationQueueService } from './notification.queue';
import { NotificationSseService } from './notification.sse';
import { FcmService } from './fcm.service';
import { FcmController } from './fcm.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [NotificationController, FcmController],
  providers: [
    NotificationService,
    NotificationQueueService,
    NotificationSseService,
    FcmService,
  ],
  exports: [
    NotificationService,
    NotificationQueueService,
    NotificationSseService,
    FcmService,
  ],
})
export class NotificationModule {}
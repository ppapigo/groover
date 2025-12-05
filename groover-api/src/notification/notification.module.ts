// src/notification/notification.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationQueueService } from './notification.queue';
import { NotificationSseService } from './notification.sse';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationQueueService,
    NotificationSseService,
  ],
  exports: [
    NotificationService,
    NotificationQueueService,
    NotificationSseService,
  ],
})
export class NotificationModule {}

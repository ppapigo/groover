// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

// Core Modules
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';

// Feature Modules
import { BlogModule } from './blog/blog.module';
// import { UsersModule } from './users/users.module';
// import { ProductsModule } from './products/products.module';

import { EscrowModule } from './escrow/escrow.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AdminModule } from './admin/admin.module';
 
import { NotificationModule } from './notification/notification.module';


@Module({
  imports: [
    // 환경변수
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    
    // 스케줄러 (상품 캐시 갱신 등)
    ScheduleModule.forRoot(),
    
    // Rate Limiting
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,   // 1초
        limit: 3,    // 3회
      },
      {
        name: 'medium',
        ttl: 10000,  // 10초
        limit: 20,   // 20회
      },
      {
        name: 'long',
        ttl: 60000,  // 1분
        limit: 100,  // 100회
      },
    ]),
    
    // Core
    PrismaModule,
    AuthModule,
    
    // Features
    BlogModule,

    EscrowModule,
    DashboardModule,
    AdminModule,
    NotificationModule,
  ],
  providers: [
    // 글로벌 Rate Limit Guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

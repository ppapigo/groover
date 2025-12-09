// src/recommendations/recommendations.module.ts
import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';
import { ChatbotService } from './chatbot.service';
import { ScoringService } from './scoring/scoring.service';
import { OptimizationService } from './optimization/optimization.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    CacheModule.register({
      ttl: 3600000, // 1시간
      max: 100, // 최대 100개 캐시
    }),
  ],
  controllers: [RecommendationsController],
  providers: [
    RecommendationsService,
    ChatbotService,
    ScoringService,
    OptimizationService,
  ],
  exports: [RecommendationsService, ChatbotService],
})
export class RecommendationsModule {}

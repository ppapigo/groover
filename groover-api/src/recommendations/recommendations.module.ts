// src/recommendations/recommendations.module.ts
import { Module } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { RecommendationsController } from './recommendations.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ScoringService } from './scoring/scoring.service';
import { OptimizationService } from './optimization/optimization.service';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    PrismaModule,
    CacheModule.register({
      ttl: 3600, // 1시간 캐시
      max: 100,  // 최대 100개 캐시
    }),
  ],
  controllers: [RecommendationsController],
  providers: [
    RecommendationsService,
    ScoringService,
    OptimizationService,
  ],
  exports: [RecommendationsService],
})
export class RecommendationsModule {}

// src/conversation/conversation.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ConversationService } from './conversation.service';
import { ConversationController } from './conversation.controller';
import { IntentParserService } from './intent/intent-parser.service';
import { LlmAdapterService } from './llm/llm-adapter.service';
import { ResponseGeneratorService } from './response/response-generator.service';
import { PromptGuardService } from './security/prompt-guard.service';  // 🛡️ 보안
import { PrismaModule } from '../prisma/prisma.module';
import { RecommendationsModule } from '../recommendations/recommendations.module';
import { CartsModule } from '../carts/carts.module';

@Module({
  imports: [
    PrismaModule,
    RecommendationsModule,
    CartsModule,
    ConfigModule,
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
  ],
  controllers: [ConversationController],
  providers: [
    ConversationService,
    IntentParserService,
    LlmAdapterService,
    ResponseGeneratorService,
    PromptGuardService,  // 🛡️ 보안 서비스 추가
  ],
  exports: [ConversationService],
})
export class ConversationModule {}

// src/dm/dm.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DmController } from './dm.controller';
import { DmService } from './dm.service';
import { DmGateway } from './dm.gateway';
import { DmBlockService } from './services/dm-block.service';
import { DmReportService } from './services/dm-report.service';
import { DmSearchService } from './services/dm-search.service';
import { LinkPreviewService } from './services/link-preview.service';
import { PrismaModule } from '../prisma/prisma.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    PrismaModule,
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 3,
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
    ConfigModule,
  ],
  controllers: [DmController],
  providers: [
    DmService,
    DmGateway,
    DmBlockService,
    DmReportService,
    DmSearchService,
    LinkPreviewService,
  ],
  exports: [DmService],
})
export class DmModule {}
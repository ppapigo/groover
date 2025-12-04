// src/adsense/adsense.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdsenseController } from './adsense.controller';
import { AdsenseService } from './adsense.service';

@Module({
  imports: [ConfigModule],
  controllers: [AdsenseController],
  providers: [AdsenseService],
  exports: [AdsenseService],
})
export class AdsenseModule {}

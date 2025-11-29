// src/groover-code/groover-code.module.ts
import { Module } from '@nestjs/common';
import { GrooverCodeService } from './groover-code.service';
import { GrooverCodeController } from './groover-code.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CartsModule } from '../carts/carts.module';

@Module({
  imports: [PrismaModule, CartsModule],
  controllers: [GrooverCodeController],
  providers: [GrooverCodeService],
  exports: [GrooverCodeService],
})
export class GrooverCodeModule {}

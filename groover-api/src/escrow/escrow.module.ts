// src/escrow/escrow.module.ts

import { Module } from '@nestjs/common';
import { EscrowController } from './escrow.controller';
import { EscrowService } from './escrow.service';
import { EscrowCronService } from './escrow.cron';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EscrowController],
  providers: [EscrowService, EscrowCronService],
  exports: [EscrowService],
})
export class EscrowModule {}

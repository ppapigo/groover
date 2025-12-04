// src/ad/ad.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { AdController } from './ad.controller';
import { AdProposalService } from './services/ad-proposal.service';
import { AdPaymentService } from './services/ad-payment.service';
import { TossPaymentService } from './services/toss-payment.service';
import { WalletService } from './services/wallet.service';
import { SettlementService } from './services/settlement.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 3,
    }),
  ],
  controllers: [AdController],
  providers: [
    AdProposalService,
    AdPaymentService,
    TossPaymentService,
    WalletService,
    SettlementService,
  ],
  exports: [
    AdProposalService,
    WalletService,
    SettlementService,
  ],
})
export class AdModule {}

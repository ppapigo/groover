import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private walletService: WalletService) {}

  // 지갑 조회
  @Get()
  async getWallet(@Request() req) {
    return {
      success: true,
      data: await this.walletService.getWalletDetail(req.user.id),
    };
  }

  // 거래 내역
  @Get('transactions')
  async getTransactions(
    @Request() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return {
      success: true,
      data: await this.walletService.getTransactions(
        req.user.id,
        parseInt(page),
        parseInt(limit),
      ),
    };
  }

  // 계좌 등록/수정
  @Put('bank-account')
  async updateBankAccount(
    @Request() req,
    @Body() body: { bankName: string; bankAccount: string; accountHolder: string },
  ) {
    return {
      success: true,
      data: await this.walletService.updateBankAccount(
        req.user.id,
        body.bankName,
        body.bankAccount,
        body.accountHolder,
      ),
    };
  }

  // 출금 요청
  @Post('withdraw')
  async requestWithdrawal(
    @Request() req,
    @Body() body: { amount: number },
  ) {
    return {
      success: true,
      data: await this.walletService.requestWithdrawal(req.user.id, body.amount),
    };
  }

  // 출금 내역
  @Get('withdrawals')
  async getWithdrawals(
    @Request() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return {
      success: true,
      data: await this.walletService.getWithdrawals(
        req.user.id,
        parseInt(page),
        parseInt(limit),
      ),
    };
  }
}
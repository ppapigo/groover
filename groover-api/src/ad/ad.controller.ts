// src/ad/ad.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdProposalService } from './services/ad-proposal.service';
import { AdPaymentService } from './services/ad-payment.service';
import { WalletService } from './services/wallet.service';
import { SettlementService } from './services/settlement.service';
import {
  CreateAdProposalDto,
  RespondProposalDto,
  ProposalQueryDto,
  InitiatePaymentDto,
  ConfirmPaymentDto,
  VerifyAccountDto,
  WithdrawDto,
  TransactionQueryDto,
} from './dto';

@Controller('ad')
@UseGuards(JwtAuthGuard)
export class AdController {
  constructor(
    private readonly proposalService: AdProposalService,
    private readonly paymentService: AdPaymentService,
    private readonly walletService: WalletService,
    private readonly settlementService: SettlementService,
  ) {}

  // ========================================
  // 광고 제안
  // ========================================

  /**
   * 광고 제안 생성
   * POST /v1/ad/proposals
   */
  @Post('proposals')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async createProposal(
    @Req() req: any,
    @Body() dto: CreateAdProposalDto,
  ) {
    const proposal = await this.proposalService.createProposal(req.user.id, dto);
    return { success: true, data: proposal };
  }

  /**
   * 내 제안 목록
   * GET /v1/ad/proposals
   */
  @Get('proposals')
  async getProposals(
    @Req() req: any,
    @Query() query: ProposalQueryDto,
  ) {
    const result = await this.proposalService.getMyProposals(
      req.user.id,
      query.type || 'received',
      query.status,
      query.cursor,
      query.limit,
    );
    return { success: true, data: result };
  }

  /**
   * 제안 상세
   * GET /v1/ad/proposals/:id
   */
  @Get('proposals/:id')
  async getProposal(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) proposalId: string,
  ) {
    const proposal = await this.proposalService.getProposal(req.user.id, proposalId);
    return { success: true, data: proposal };
  }

  /**
   * 제안 응답 (수락/거절)
   * POST /v1/ad/proposals/:id/respond
   */
  @Post('proposals/:id/respond')
  @HttpCode(HttpStatus.OK)
  async respondToProposal(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) proposalId: string,
    @Body() dto: RespondProposalDto,
  ) {
    const result = await this.proposalService.respondToProposal(
      req.user.id,
      proposalId,
      dto,
    );
    return { success: true, data: result };
  }

  /**
   * 작업 완료 처리 (크리에이터)
   * POST /v1/ad/proposals/:id/complete
   */
  @Post('proposals/:id/complete')
  @HttpCode(HttpStatus.OK)
  async markAsCompleted(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) proposalId: string,
  ) {
    const result = await this.proposalService.markAsCompleted(req.user.id, proposalId);
    return { success: true, data: result };
  }

  /**
   * 작업 확인 및 정산 (광고주)
   * POST /v1/ad/proposals/:id/confirm
   */
  @Post('proposals/:id/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmCompletion(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) proposalId: string,
  ) {
    const result = await this.settlementService.confirmCompletion(
      req.user.id,
      proposalId,
    );
    return { success: true, data: result };
  }

  // ========================================
  // 결제
  // ========================================

  /**
   * 결제 시작
   * POST /v1/ad/payments/initiate
   */
  @Post('payments/initiate')
  async initiatePayment(
    @Req() req: any,
    @Body() dto: InitiatePaymentDto,
  ) {
    const result = await this.paymentService.initiatePayment(req.user.id, dto);
    return { success: true, data: result };
  }

  /**
   * 결제 승인 (토스 콜백)
   * POST /v1/ad/payments/confirm
   */
  @Post('payments/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmPayment(
    @Req() req: any,
    @Body() dto: ConfirmPaymentDto,
  ) {
    const result = await this.paymentService.confirmPayment(req.user.id, dto);
    return { success: true, data: result };
  }

  /**
   * 결제 취소
   * POST /v1/ad/payments/:id/cancel
   */
  @Post('payments/:id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelPayment(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) paymentId: string,
    @Body('reason') reason: string,
  ) {
    const result = await this.paymentService.cancelPayment(
      req.user.id,
      paymentId,
      reason,
    );
    return { success: true, data: result };
  }

  /**
   * 결제 내역
   * GET /v1/ad/payments
   */
  @Get('payments')
  async getPayments(
    @Req() req: any,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ) {
    const result = await this.paymentService.getPayments(
      req.user.id,
      cursor,
      limit || 20,
    );
    return { success: true, data: result };
  }

  // ========================================
  // 지갑
  // ========================================

  /**
   * 내 지갑 조회
   * GET /v1/ad/wallet
   */
  @Get('wallet')
  async getWallet(@Req() req: any) {
    const wallet = await this.walletService.getWalletDetails(req.user.id);
    return { success: true, data: wallet };
  }

  /**
   * 계좌 인증 (KYC)
   * POST /v1/ad/wallet/verify
   */
  @Post('wallet/verify')
  @HttpCode(HttpStatus.OK)
  async verifyAccount(
    @Req() req: any,
    @Body() dto: VerifyAccountDto,
  ) {
    const result = await this.walletService.verifyAccount(req.user.id, dto);
    return { success: true, data: result };
  }

  /**
   * 출금 요청
   * POST /v1/ad/wallet/withdraw
   */
  @Post('wallet/withdraw')
  @Throttle({ default: { ttl: 86400000, limit: 3 } }) // 하루 3회 제한
  @HttpCode(HttpStatus.OK)
  async requestWithdrawal(
    @Req() req: any,
    @Body() dto: WithdrawDto,
  ) {
    const result = await this.walletService.requestWithdrawal(req.user.id, dto);
    return { success: true, data: result };
  }

  /**
   * 거래 내역
   * GET /v1/ad/wallet/transactions
   */
  @Get('wallet/transactions')
  async getTransactions(
    @Req() req: any,
    @Query() query: TransactionQueryDto,
  ) {
    const result = await this.walletService.getTransactions(
      req.user.id,
      query.type,
      query.cursor,
      query.limit,
    );
    return { success: true, data: result };
  }

  /**
   * 출금 내역
   * GET /v1/ad/wallet/withdrawals
   */
  @Get('wallet/withdrawals')
  async getWithdrawals(
    @Req() req: any,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ) {
    const result = await this.walletService.getWithdrawals(
      req.user.id,
      cursor,
      limit || 20,
    );
    return { success: true, data: result };
  }

  // ========================================
  // 정산
  // ========================================

  /**
   * 내 정산 내역
   * GET /v1/ad/settlements
   */
  @Get('settlements')
  async getSettlements(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ) {
    const result = await this.settlementService.getMySettlements(
      req.user.id,
      status,
      cursor,
      limit || 20,
    );
    return { success: true, data: result };
  }

  /**
   * 정산 통계
   * GET /v1/ad/settlements/stats
   */
  @Get('settlements/stats')
  async getSettlementStats(@Req() req: any) {
    const stats = await this.settlementService.getSettlementStats(req.user.id);
    return { success: true, data: stats };
  }
}

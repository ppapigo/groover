// src/escrow/escrow.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EscrowService } from './escrow.service';
import {
  CreateProposalDto,
  SubmitContentDto,
  PaymentDto,
  RejectContentDto,
  CancelDealDto,
  AdDealResponseDto,
} from './dto/escrow.dto';

@ApiTags('Escrow (광고 거래)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('escrow')
export class EscrowController {
  constructor(private readonly escrowService: EscrowService) {}

  // ========================================
  // 제안 관리
  // ========================================

  @Post('proposal')
  @ApiOperation({ 
    summary: '광고 제안 생성',
    description: '광고주가 크리에이터에게 광고 제안을 보냅니다. 수수료 15%가 자동 계산됩니다.'
  })
  @ApiResponse({ status: 201, description: '제안 생성 성공', type: AdDealResponseDto })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  async createProposal(@Request() req, @Body() dto: CreateProposalDto) {
    return this.escrowService.createProposal(req.user.id, dto);
  }

  @Post('proposal/:dealId/accept')
  @ApiOperation({ 
    summary: '광고 제안 수락',
    description: '크리에이터가 광고 제안을 수락합니다.'
  })
  @ApiParam({ name: 'dealId', description: '거래 ID' })
  @ApiResponse({ status: 200, description: '수락 성공', type: AdDealResponseDto })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '거래를 찾을 수 없음' })
  async acceptProposal(@Request() req, @Param('dealId') dealId: string) {
    return this.escrowService.acceptProposal(req.user.id, dealId);
  }

  @Post('proposal/:dealId/reject')
  @ApiOperation({ 
    summary: '광고 제안 거절',
    description: '크리에이터가 광고 제안을 거절합니다.'
  })
  @ApiParam({ name: 'dealId', description: '거래 ID' })
  @ApiResponse({ status: 200, description: '거절 성공', type: AdDealResponseDto })
  async rejectProposal(@Request() req, @Param('dealId') dealId: string) {
    return this.escrowService.rejectProposal(req.user.id, dealId);
  }

  // ========================================
  // 결제
  // ========================================

  @Post('payment/:dealId')
  @ApiOperation({ 
    summary: '결제 완료 처리',
    description: '광고주가 결제를 완료합니다. 에스크로에 금액이 보관되고 14일 제출 기한이 시작됩니다.'
  })
  @ApiParam({ name: 'dealId', description: '거래 ID' })
  @ApiResponse({ status: 200, description: '결제 성공', type: AdDealResponseDto })
  @ApiResponse({ status: 400, description: '금액 불일치 또는 잘못된 상태' })
  async processPayment(
    @Request() req,
    @Param('dealId') dealId: string,
    @Body() dto: PaymentDto,
  ) {
    return this.escrowService.processPayment(
      req.user.id,
      dealId,
      dto.paymentId,
      dto.amount,
    );
  }

  // ========================================
  // 콘텐츠 제출/확인
  // ========================================

  @Post('submit')
  @ApiOperation({ 
    summary: '콘텐츠 제출',
    description: '크리에이터가 광고 콘텐츠를 제출합니다. 광고주에게 72시간 확인 기한이 부여됩니다.'
  })
  @ApiResponse({ status: 200, description: '제출 성공', type: AdDealResponseDto })
  @ApiResponse({ status: 400, description: '기한 만료 또는 잘못된 상태' })
  async submitContent(@Request() req, @Body() dto: SubmitContentDto) {
    return this.escrowService.submitContent(req.user.id, dto);
  }

  @Post('confirm/:dealId')
  @ApiOperation({ 
    summary: '콘텐츠 확인 승인',
    description: '광고주가 콘텐츠를 확인하고 승인합니다. 크리에이터에게 정산됩니다.'
  })
  @ApiParam({ name: 'dealId', description: '거래 ID' })
  @ApiResponse({ status: 200, description: '승인 및 정산 완료', type: AdDealResponseDto })
  async confirmContent(@Request() req, @Param('dealId') dealId: string) {
    return this.escrowService.confirmContent(req.user.id, dealId);
  }

  @Post('reject/:dealId')
  @ApiOperation({ 
    summary: '콘텐츠 거절',
    description: '광고주가 콘텐츠를 거절합니다. 크리에이터는 재제출 가능합니다.'
  })
  @ApiParam({ name: 'dealId', description: '거래 ID' })
  @ApiResponse({ status: 200, description: '거절 성공 (재제출 가능)', type: AdDealResponseDto })
  async rejectContent(
    @Request() req,
    @Param('dealId') dealId: string,
    @Body() dto: RejectContentDto,
  ) {
    return this.escrowService.rejectContent(req.user.id, dealId, dto.reason);
  }

  // ========================================
  // 취소
  // ========================================

  @Post('cancel/:dealId')
  @ApiOperation({ 
    summary: '거래 취소',
    description: '결제 전 거래를 취소합니다. 결제 후에는 취소 불가.'
  })
  @ApiParam({ name: 'dealId', description: '거래 ID' })
  @ApiResponse({ status: 200, description: '취소 성공', type: AdDealResponseDto })
  @ApiResponse({ status: 400, description: '취소 불가 상태' })
  async cancelDeal(
    @Request() req,
    @Param('dealId') dealId: string,
    @Body() dto: CancelDealDto,
  ) {
    return this.escrowService.cancelDeal(req.user.id, dealId, dto.reason);
  }

  // ========================================
  // 조회
  // ========================================

  @Get('deal/:dealId')
  @ApiOperation({ summary: '거래 상세 조회' })
  @ApiParam({ name: 'dealId', description: '거래 ID' })
  @ApiResponse({ status: 200, description: '조회 성공', type: AdDealResponseDto })
  @ApiResponse({ status: 404, description: '거래를 찾을 수 없음' })
  async getDeal(@Param('dealId') dealId: string) {
    return this.escrowService.getDeal(dealId);
  }

  @Get('my/advertiser')
  @ApiOperation({ 
    summary: '내 광고 목록 (광고주)',
    description: '광고주로서 보낸 제안 목록을 조회합니다.'
  })
  @ApiQuery({ name: 'status', required: false, description: '상태 필터', enum: ['PROPOSED', 'ACCEPTED', 'PAID', 'SUBMITTED', 'SETTLED', 'CANCELLED'] })
  @ApiResponse({ status: 200, description: '조회 성공', type: [AdDealResponseDto] })
  async getMyAdvertiserDeals(@Request() req, @Query('status') status?: string) {
    return this.escrowService.getMyDeals(req.user.id, 'advertiser', status);
  }

  @Get('my/creator')
  @ApiOperation({ 
    summary: '내 광고 목록 (크리에이터)',
    description: '크리에이터로서 받은 제안 목록을 조회합니다.'
  })
  @ApiQuery({ name: 'status', required: false, description: '상태 필터', enum: ['PROPOSED', 'ACCEPTED', 'PAID', 'SUBMITTED', 'SETTLED', 'CANCELLED'] })
  @ApiResponse({ status: 200, description: '조회 성공', type: [AdDealResponseDto] })
  async getMyCreatorDeals(@Request() req, @Query('status') status?: string) {
    return this.escrowService.getMyDeals(req.user.id, 'creator', status);
  }
}

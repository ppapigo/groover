// src/ad/services/toss-payment.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

interface TossPaymentResponse {
  paymentKey: string;
  orderId: string;
  status: string;
  totalAmount: number;
  method: string;
  requestedAt: string;
  approvedAt: string;
  card?: {
    company: string;
    number: string;
  };
  virtualAccount?: {
    bankCode: string;
    accountNumber: string;
  };
}

interface TossCancelResponse {
  paymentKey: string;
  orderId: string;
  status: string;
  cancels: Array<{
    cancelAmount: number;
    canceledAt: string;
    cancelReason: string;
  }>;
}

@Injectable()
export class TossPaymentService {
  private readonly logger = new Logger(TossPaymentService.name);
  private readonly baseUrl = 'https://api.tosspayments.com/v1';
  private readonly secretKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.secretKey = this.configService.get<string>('TOSS_SECRET_KEY') || '';
  }

  /**
   * 결제 승인
   */
  async confirmPayment(
    paymentKey: string,
    orderId: string,
    amount: number,
  ): Promise<TossPaymentResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/payments/confirm`,
          {
            paymentKey,
            orderId,
            amount,
          },
          {
            headers: this.getAuthHeaders(),
          },
        ),
      );

      this.logger.log(`Payment confirmed: ${orderId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Payment confirmation failed: ${error.message}`);
      throw new BadRequestException(
        error.response?.data?.message || '결제 승인에 실패했습니다.',
      );
    }
  }

  /**
   * 결제 조회
   */
  async getPayment(paymentKey: string): Promise<TossPaymentResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/payments/${paymentKey}`,
          {
            headers: this.getAuthHeaders(),
          },
        ),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Get payment failed: ${error.message}`);
      throw new BadRequestException('결제 정보 조회에 실패했습니다.');
    }
  }

  /**
   * 결제 취소
   */
  async cancelPayment(
    paymentKey: string,
    cancelReason: string,
    cancelAmount?: number,
  ): Promise<TossCancelResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/payments/${paymentKey}/cancel`,
          {
            cancelReason,
            ...(cancelAmount && { cancelAmount }),
          },
          {
            headers: this.getAuthHeaders(),
          },
        ),
      );

      this.logger.log(`Payment cancelled: ${paymentKey}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Payment cancellation failed: ${error.message}`);
      throw new BadRequestException(
        error.response?.data?.message || '결제 취소에 실패했습니다.',
      );
    }
  }

  /**
   * 주문 ID 생성
   */
  generateOrderId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `GRV_${timestamp}_${random}`.toUpperCase();
  }

  /**
   * 수수료 계산 (15% 고정)
   */
  calculateFees(amount: number): {
    totalAmount: number;
    platformFee: number;
    creatorAmount: number;
    feeRate: number;
  } {
    const feeRate = 0.15; // 15% 고정
    const platformFee = Math.floor(amount * feeRate);
    const creatorAmount = amount - platformFee;

    return {
      totalAmount: amount,
      platformFee,
      creatorAmount,
      feeRate,
    };
  }

  private getAuthHeaders() {
    const encoded = Buffer.from(`${this.secretKey}:`).toString('base64');
    return {
      Authorization: `Basic ${encoded}`,
      'Content-Type': 'application/json',
    };
  }
}

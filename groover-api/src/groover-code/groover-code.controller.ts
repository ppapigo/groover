// src/groover-code/groover-code.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { GrooverCodeService } from './groover-code.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EncodeCartDto } from './dto/encode-cart.dto';
import { DecodeCodeDto } from './dto/decode-code.dto';
import { SaveToCartDto } from './dto/save-to-cart.dto';

@Controller('codes')
export class GrooverCodeController {
  constructor(private readonly grooverCodeService: GrooverCodeService) {}

  /**
   * 장바구니 → Groover Code 인코딩
   * POST /v1/codes/encode
   */
  @Post('encode')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async encode(@Request() req, @Body() encodeDto: EncodeCartDto) {
    const result = await this.grooverCodeService.encode(
      encodeDto.cartId,
      req.user.id,
    );
    return {
      success: true,
      message: 'Groover Code generated successfully',
      data: result,
    };
  }

  /**
   * Groover Code → 장바구니 디코딩
   * POST /v1/codes/decode
   */
  @Post('decode')
  @HttpCode(HttpStatus.OK)
  async decode(@Body() decodeDto: DecodeCodeDto) {
    const result = await this.grooverCodeService.decode(decodeDto.grooverCode);
    return {
      success: result.valid,
      data: result,
    };
  }

  /**
   * Groover Code로 장바구니 생성 (내 장바구니로 저장)
   * POST /v1/codes/save
   */
  @Post('save')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async saveToCart(@Request() req, @Body() saveDto: SaveToCartDto) {
    const cart = await this.grooverCodeService.saveToCart(
      saveDto.grooverCode,
      req.user.id,
      saveDto.cartName,
    );
    return {
      success: true,
      message: 'Cart created from Groover Code',
      data: cart,
    };
  }

  /**
   * 코드 정보 조회 (통계)
   * GET /v1/codes/:code
   */
  @Get(':code')
  async getCodeInfo(@Param('code') code: string) {
    const stats = await this.grooverCodeService.getCodeStats(code);
    return {
      success: true,
      data: stats,
    };
  }

  /**
   * 코드 디코딩 (GET 방식)
   * GET /v1/codes/:code/decode
   */
  @Get(':code/decode')
  async decodeGet(@Param('code') code: string) {
    const result = await this.grooverCodeService.decode(code);
    return {
      success: result.valid,
      data: result,
    };
  }

  /**
   * 장바구니 쇼핑 링크 생성
   * GET /v1/codes/cart/:cartId/links
   */
  @Get('cart/:cartId/links')
  @UseGuards(JwtAuthGuard)
  async getCartLinks(@Param('cartId', ParseUUIDPipe) cartId: string) {
    const links = await this.grooverCodeService.generateCartLinks(cartId);
    return {
      success: true,
      data: links,
    };
  }
}

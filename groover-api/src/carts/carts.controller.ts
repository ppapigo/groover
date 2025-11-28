// src/carts/carts.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CartsService } from './carts.service';
import { CreateCartDto } from './dto/create-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('carts')
@UseGuards(JwtAuthGuard)
export class CartsController {
  constructor(private readonly cartsService: CartsService) {}

  /**
   * 장바구니 생성
   * POST /v1/carts
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Request() req, @Body() createCartDto: CreateCartDto) {
    const cart = await this.cartsService.create(req.user.id, createCartDto);
    return {
      success: true,
      message: 'Cart created successfully',
      data: cart,
    };
  }

  /**
   * 내 장바구니 목록 조회
   * GET /v1/carts
   */
  @Get()
  async findAll(@Request() req) {
    const carts = await this.cartsService.findAllByUser(req.user.id);
    return {
      success: true,
      data: carts,
    };
  }

  /**
   * 장바구니 상세 조회
   * GET /v1/carts/:id
   */
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    const cart = await this.cartsService.findOne(id, req.user.id);
    return {
      success: true,
      data: cart,
    };
  }

  /**
   * Groover Code로 장바구니 조회
   * GET /v1/carts/code/:code
   */
  @Get('code/:code')
  async findByCode(@Param('code') code: string) {
    const cart = await this.cartsService.findByGrooverCode(code);
    return {
      success: true,
      data: cart,
    };
  }

  /**
   * 장바구니 수정
   * PATCH /v1/carts/:id
   */
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
    @Body() updateCartDto: UpdateCartDto,
  ) {
    const cart = await this.cartsService.update(id, req.user.id, updateCartDto);
    return {
      success: true,
      message: 'Cart updated successfully',
      data: cart,
    };
  }

  /**
   * 장바구니 삭제
   * DELETE /v1/carts/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    await this.cartsService.remove(id, req.user.id);
    return {
      success: true,
      message: 'Cart deleted successfully',
    };
  }

  /**
   * 장바구니에 상품 추가
   * POST /v1/carts/:id/items
   */
  @Post(':id/items')
  @HttpCode(HttpStatus.CREATED)
  async addItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
    @Body() addItemDto: AddItemDto,
  ) {
    const item = await this.cartsService.addItem(id, req.user.id, addItemDto);
    return {
      success: true,
      message: 'Item added to cart',
      data: item,
    };
  }

  /**
   * 장바구니 아이템 수량 수정
   * PATCH /v1/carts/:cartId/items/:itemId
   */
  @Patch(':cartId/items/:itemId')
  async updateItem(
    @Param('cartId', ParseUUIDPipe) cartId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Request() req,
    @Body() updateItemDto: UpdateItemDto,
  ) {
    const result = await this.cartsService.updateItem(
      cartId,
      itemId,
      req.user.id,
      updateItemDto,
    );
    return {
      success: true,
      message: 'Item updated',
      data: result,
    };
  }

  /**
   * 장바구니에서 상품 삭제
   * DELETE /v1/carts/:cartId/items/:itemId
   */
  @Delete(':cartId/items/:itemId')
  @HttpCode(HttpStatus.OK)
  async removeItem(
    @Param('cartId', ParseUUIDPipe) cartId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Request() req,
  ) {
    await this.cartsService.removeItem(cartId, itemId, req.user.id);
    return {
      success: true,
      message: 'Item removed from cart',
    };
  }

  /**
   * 장바구니 비우기
   * DELETE /v1/carts/:id/clear
   */
  @Delete(':id/clear')
  @HttpCode(HttpStatus.OK)
  async clearCart(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    await this.cartsService.clearCart(id, req.user.id);
    return {
      success: true,
      message: 'Cart cleared successfully',
    };
  }

  /**
   * 장바구니 공개 설정
   * PATCH /v1/carts/:id/public
   */
  @Patch(':id/public')
  async setPublic(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
    @Body('isPublic') isPublic: boolean,
  ) {
    const cart = await this.cartsService.setPublic(id, req.user.id, isPublic);
    return {
      success: true,
      message: `Cart is now ${isPublic ? 'public' : 'private'}`,
      data: cart,
    };
  }
}

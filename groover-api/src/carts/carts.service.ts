// src/carts/carts.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCartDto } from './dto/create-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Injectable()
export class CartsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 장바구니 생성
   */
  async create(userId: string, createCartDto: CreateCartDto) {
    return this.prisma.cart.create({
      data: {
        userId,
        name: createCartDto.name,
        budget: createCartDto.budget,
        totalPrice: 0,
        itemCount: 0,
      },
      include: {
        cartItems: {
          include: { product: true },
        },
      },
    });
  }

  /**
   * 내 장바구니 목록 조회
   */
  async findAllByUser(userId: string) {
    return this.prisma.cart.findMany({
      where: { userId },
      include: {
        cartItems: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 장바구니 상세 조회
   */
  async findOne(id: string, userId?: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { id },
      include: {
        cartItems: {
          include: { product: true },
        },
      },
    });

    if (!cart) {
      throw new NotFoundException(`Cart with ID ${id} not found`);
    }

    // 비공개 장바구니는 본인만 조회 가능
    if (!cart.isPublic && userId && cart.userId !== userId) {
      throw new ForbiddenException('Access denied to this cart');
    }

    return cart;
  }

  /**
   * Groover Code로 장바구니 조회
   */
  async findByGrooverCode(code: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { grooverCode: code },
      include: {
        cartItems: {
          include: { product: true },
        },
      },
    });

    if (!cart) {
      throw new NotFoundException(`Cart with code ${code} not found`);
    }

    // 조회수 증가
    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { viewCount: { increment: 1 } },
    });

    return cart;
  }

  /**
   * 장바구니 수정
   */
  async update(id: string, userId: string, updateCartDto: UpdateCartDto) {
    const cart = await this.findOne(id, userId);

    if (cart.userId !== userId) {
      throw new ForbiddenException('You can only update your own cart');
    }

    return this.prisma.cart.update({
      where: { id },
      data: updateCartDto,
      include: {
        cartItems: {
          include: { product: true },
        },
      },
    });
  }

  /**
   * 장바구니 삭제
   */
  async remove(id: string, userId: string) {
    const cart = await this.findOne(id, userId);

    if (cart.userId !== userId) {
      throw new ForbiddenException('You can only delete your own cart');
    }

    await this.prisma.cart.delete({ where: { id } });
    return { message: 'Cart deleted successfully' };
  }

  /**
   * 장바구니에 상품 추가
   */
  async addItem(cartId: string, userId: string, addItemDto: AddItemDto) {
    const cart = await this.findOne(cartId, userId);

    if (cart.userId !== userId) {
      throw new ForbiddenException('You can only modify your own cart');
    }

    // 상품 존재 확인
    const product = await this.prisma.product.findUnique({
      where: { id: addItemDto.productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${addItemDto.productId} not found`);
    }

    if (!product.isActive) {
      throw new BadRequestException('This product is no longer available');
    }

    // 이미 장바구니에 있는지 확인
    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId,
          productId: addItemDto.productId,
        },
      },
    });

    if (existingItem) {
      // 수량 업데이트
      const updatedItem = await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity + (addItemDto.quantity || 1),
        },
        include: { product: true },
      });

      await this.recalculateCart(cartId);
      return updatedItem;
    }

    // 새 아이템 추가
    const newItem = await this.prisma.cartItem.create({
      data: {
        cartId,
        productId: addItemDto.productId,
        quantity: addItemDto.quantity || 1,
        priceAtAddition: product.price,
      },
      include: { product: true },
    });

    await this.recalculateCart(cartId);
    return newItem;
  }

  /**
   * 장바구니 아이템 수량 수정
   */
  async updateItem(
    cartId: string,
    itemId: string,
    userId: string,
    updateItemDto: UpdateItemDto,
  ) {
    const cart = await this.findOne(cartId, userId);

    if (cart.userId !== userId) {
      throw new ForbiddenException('You can only modify your own cart');
    }

    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId },
    });

    if (!item) {
      throw new NotFoundException(`Item with ID ${itemId} not found in cart`);
    }

    if (updateItemDto.quantity <= 0) {
      // 수량이 0 이하면 삭제
      await this.prisma.cartItem.delete({ where: { id: itemId } });
      await this.recalculateCart(cartId);
      return { message: 'Item removed from cart' };
    }

    const updatedItem = await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: updateItemDto.quantity },
      include: { product: true },
    });

    await this.recalculateCart(cartId);
    return updatedItem;
  }

  /**
   * 장바구니에서 상품 삭제
   */
  async removeItem(cartId: string, itemId: string, userId: string) {
    const cart = await this.findOne(cartId, userId);

    if (cart.userId !== userId) {
      throw new ForbiddenException('You can only modify your own cart');
    }

    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId },
    });

    if (!item) {
      throw new NotFoundException(`Item with ID ${itemId} not found in cart`);
    }

    await this.prisma.cartItem.delete({ where: { id: itemId } });
    await this.recalculateCart(cartId);

    return { message: 'Item removed from cart' };
  }

  /**
   * 장바구니 비우기
   */
  async clearCart(cartId: string, userId: string) {
    const cart = await this.findOne(cartId, userId);

    if (cart.userId !== userId) {
      throw new ForbiddenException('You can only modify your own cart');
    }

    await this.prisma.cartItem.deleteMany({ where: { cartId } });
    await this.recalculateCart(cartId);

    return { message: 'Cart cleared successfully' };
  }

  /**
   * 장바구니 총액/수량 재계산
   */
  private async recalculateCart(cartId: string) {
    const items = await this.prisma.cartItem.findMany({
      where: { cartId },
      include: { product: true },
    });

    const totalPrice = items.reduce(
      (sum, item) => sum + item.priceAtAddition * item.quantity,
      0,
    );
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    await this.prisma.cart.update({
      where: { id: cartId },
      data: { totalPrice, itemCount },
    });
  }

  /**
   * 장바구니 공개/비공개 설정
   */
  async setPublic(cartId: string, userId: string, isPublic: boolean) {
    const cart = await this.findOne(cartId, userId);

    if (cart.userId !== userId) {
      throw new ForbiddenException('You can only modify your own cart');
    }

    return this.prisma.cart.update({
      where: { id: cartId },
      data: { isPublic },
    });
  }
}

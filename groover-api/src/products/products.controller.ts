// src/products/products.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FilterProductDto } from './dto/filter-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /**
   * 상품 등록 (인증 필요)
   * POST /v1/products
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createProductDto: CreateProductDto) {
    const product = await this.productsService.create(createProductDto);
    return {
      success: true,
      message: 'Product created successfully',
      data: product,
    };
  }

  /**
   * 상품 일괄 등록 (인증 필요)
   * POST /v1/products/bulk
   */
  @Post('bulk')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async bulkCreate(@Body() products: CreateProductDto[]) {
    const result = await this.productsService.bulkCreate(products);
    return {
      success: true,
      message: `${result.count} products created`,
      data: { count: result.count },
    };
  }

  /**
   * 상품 목록 조회 (공개)
   * GET /v1/products
   */
  @Get()
  async findAll(@Query() filterDto: FilterProductDto) {
    const result = await this.productsService.findAll(filterDto);
    return {
      success: true,
      ...result,
    };
  }

  /**
   * 상품 검색 (공개)
   * GET /v1/products/search?q=검색어
   */
  @Get('search')
  async search(
    @Query('q') query: string,
    @Query() filterDto: FilterProductDto,
  ) {
    if (!query || query.trim().length === 0) {
      return {
        success: true,
        data: [],
        query: '',
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };
    }

    const result = await this.productsService.search(query.trim(), filterDto);
    return {
      success: true,
      ...result,
    };
  }

  /**
   * 카테고리 목록 조회 (공개)
   * GET /v1/products/categories
   */
  @Get('categories')
  async getCategories() {
    const categories = await this.productsService.getCategories();
    return {
      success: true,
      data: categories,
    };
  }

  /**
   * 인기 상품 조회 (공개)
   * GET /v1/products/popular
   */
  @Get('popular')
  async getPopular(@Query('limit') limit?: number) {
    const products = await this.productsService.getPopularProducts(limit || 10);
    return {
      success: true,
      data: products,
    };
  }

  /**
   * 상품 상세 조회 (공개)
   * GET /v1/products/:id
   */
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const product = await this.productsService.findOne(id);
    return {
      success: true,
      data: product,
    };
  }

  /**
   * 상품 수정 (인증 필요)
   * PATCH /v1/products/:id
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    const product = await this.productsService.update(id, updateProductDto);
    return {
      success: true,
      message: 'Product updated successfully',
      data: product,
    };
  }

  /**
   * 상품 삭제 (소프트 삭제, 인증 필요)
   * DELETE /v1/products/:id
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.productsService.remove(id);
    return {
      success: true,
      message: 'Product deleted successfully',
    };
  }
}

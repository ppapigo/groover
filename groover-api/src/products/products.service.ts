// src/products/products.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FilterProductDto } from './dto/filter-product.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 상품 생성
   */
  async create(createProductDto: CreateProductDto) {
    // 외부 ID 중복 체크
    if (createProductDto.externalId) {
      const existing = await this.prisma.product.findUnique({
        where: { externalId: createProductDto.externalId },
      });
      if (existing) {
        throw new ConflictException('Product with this external ID already exists');
      }
    }

    // 정규화된 이름 생성 (검색용)
    const normalizedName = this.normalizeProductName(createProductDto.name);

    return this.prisma.product.create({
      data: {
        ...createProductDto,
        normalizedName,
        tags: createProductDto.tags || [],
      },
    });
  }

  /**
   * 상품 목록 조회 (필터링, 페이징)
   */
  async findAll(filterDto: FilterProductDto) {
    const {
      page = 1,
      limit = 20,
      category,
      subcategory,
      minPrice,
      maxPrice,
      minRating,
      source,
      brand,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      isActive = true,
    } = filterDto;

    const skip = (page - 1) * limit;

    // where 조건 구성
    const where: Prisma.ProductWhereInput = {
      isActive,
    };

    if (category) {
      where.category = category;
    }
    if (subcategory) {
      where.subcategory = subcategory;
    }
    if (source) {
      where.source = source;
    }
    if (brand) {
      where.brand = { contains: brand, mode: 'insensitive' };
    }
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }
    if (minRating !== undefined) {
      where.rating = { gte: minRating };
    }

    // orderBy 구성
    const orderBy: Prisma.ProductOrderByWithRelationInput = {};
    orderBy[sortBy] = sortOrder;

    // 쿼리 실행
    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * 상품 검색
   */
  async search(query: string, filterDto: FilterProductDto) {
    const {
      page = 1,
      limit = 20,
      category,
      minPrice,
      maxPrice,
      sortBy = 'popularityScore',
      sortOrder = 'desc',
    } = filterDto;

    const skip = (page - 1) * limit;
    const normalizedQuery = this.normalizeProductName(query);

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { normalizedName: { contains: normalizedQuery, mode: 'insensitive' } },
        { brand: { contains: query, mode: 'insensitive' } },
        { tags: { has: query.toLowerCase() } },
      ],
    };

    if (category) {
      where.category = category;
    }
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput = {};
    orderBy[sortBy] = sortOrder;

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products,
      query,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * 상품 상세 조회
   */
  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        productSources: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  /**
   * 여러 상품 조회 (ID 배열)
   */
  async findByIds(ids: string[]) {
    return this.prisma.product.findMany({
      where: {
        id: { in: ids },
        isActive: true,
      },
    });
  }

  /**
   * 카테고리별 상품 조회 (추천용)
   */
  async findByCategory(category: string, maxPrice: number, limit: number = 50) {
    return this.prisma.product.findMany({
      where: {
        category,
        price: { lte: maxPrice },
        isActive: true,
      },
      orderBy: [
        { popularityScore: 'desc' },
        { rating: 'desc' },
      ],
      take: limit,
    });
  }

  /**
   * 상품 수정
   */
  async update(id: string, updateProductDto: UpdateProductDto) {
    // 존재 여부 확인
    await this.findOne(id);

    // 정규화된 이름 업데이트
    const data: Prisma.ProductUpdateInput = { ...updateProductDto };
    if (updateProductDto.name) {
      data.normalizedName = this.normalizeProductName(updateProductDto.name);
    }

    return this.prisma.product.update({
      where: { id },
      data,
    });
  }

  /**
   * 상품 소프트 삭제
   */
  async remove(id: string) {
    // 존재 여부 확인
    await this.findOne(id);

    return this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * 상품 영구 삭제 (관리자용)
   */
  async hardDelete(id: string) {
    await this.findOne(id);
    return this.prisma.product.delete({ where: { id } });
  }

  /**
   * 상품 일괄 등록 (시딩/동기화용)
   */
  async bulkCreate(products: CreateProductDto[]) {
    const data = products.map((product) => ({
      ...product,
      normalizedName: this.normalizeProductName(product.name),
      tags: product.tags || [],
    }));

    return this.prisma.product.createMany({
      data,
      skipDuplicates: true,
    });
  }

  /**
   * 상품명 정규화 (검색 최적화)
   */
  private normalizeProductName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\[.*?\]/g, '') // 대괄호 내용 제거
      .replace(/\(.*?\)/g, '') // 소괄호 내용 제거
      .replace(/[^가-힣a-z0-9\s]/g, '') // 특수문자 제거
      .replace(/\s+/g, ' ') // 연속 공백 제거
      .trim();
  }

  /**
   * 카테고리 목록 조회
   */
  async getCategories() {
    const categories = await this.prisma.product.groupBy({
      by: ['category'],
      where: { isActive: true },
      _count: { category: true },
      orderBy: { _count: { category: 'desc' } },
    });

    return categories.map((c) => ({
      name: c.category,
      count: c._count.category,
    }));
  }

  /**
   * 인기 상품 조회
   */
  async getPopularProducts(limit: number = 10) {
    return this.prisma.product.findMany({
      where: { isActive: true },
      orderBy: [
        { popularityScore: 'desc' },
        { reviewCount: 'desc' },
      ],
      take: limit,
    });
  }
}

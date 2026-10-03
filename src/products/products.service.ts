import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { ListProductsQueryDto } from './dto/list-products-query.dto.js';
import type { ProductDetailResponseDto } from './dto/product-detail-response.dto.js';
import type { PaginatedProductsResponseDto } from './dto/paginated-products-response.dto.js';
import {
  toProductDetailResponse,
  toProductListItemResponse,
} from './products.mapper.js';
import { productDetailSelect, productListSelect } from './products.select.js';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createProductDto: CreateProductDto,
  ): Promise<ProductDetailResponseDto> {
    try {
      const product = await this.prisma.product.create({
        data: {
          sku: createProductDto.sku,
          name: createProductDto.name,
          description: createProductDto.description,
          price: createProductDto.price,
          currency: createProductDto.currency,
          inventoryBalance: {
            create: {},
          },
        },
        select: productDetailSelect,
      });

      return toProductDetailResponse(product);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Ya existe un producto con ese SKU');
      }

      throw error;
    }
  }

  async findAll(
    query: ListProductsQueryDto,
  ): Promise<PaginatedProductsResponseDto> {
    const { page, limit, search, status, currency } = query;
    const where: Prisma.ProductWhereInput = {
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { sku: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(status ? { status } : {}),
      ...(currency ? { currency } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: productListSelect,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: data.map(toProductListItemResponse),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<ProductDetailResponseDto> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: productDetailSelect,
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    return toProductDetailResponse(product);
  }
}

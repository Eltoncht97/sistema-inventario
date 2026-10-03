import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
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
import {
  productDetailSelect,
  productListSelect,
  type ProductDetailRecord,
} from './products.select.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { ProductStatus } from '../generated/prisma/enums.js';
import { isSerializableTransactionConflict } from '../prisma/prisma-error.utils.js';

const MAX_SERIALIZABLE_ATTEMPTS = 3;

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

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<ProductDetailResponseDto> {
    const { name, description, price, currency, status } = updateProductDto;

    if (
      name === undefined &&
      description === undefined &&
      price === undefined &&
      currency === undefined &&
      status === undefined
    ) {
      throw new BadRequestException(
        'Debe enviar al menos un campo para actualizar',
      );
    }

    const data: Prisma.ProductUpdateInput = {
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(price !== undefined ? { price } : {}),
      ...(currency !== undefined ? { currency } : {}),
      ...(status !== undefined ? { status } : {}),
    };
    const product = await this.updateInSerializableTransaction(
      id,
      status,
      data,
    );

    return toProductDetailResponse(product);
  }

  private async updateInSerializableTransaction(
    id: string,
    requestedStatus: ProductStatus | undefined,
    data: Prisma.ProductUpdateInput,
  ): Promise<ProductDetailRecord> {
    for (let attempt = 1; attempt <= MAX_SERIALIZABLE_ATTEMPTS; attempt += 1) {
      try {
        return await this.prisma.$transaction(
          async (transaction) => {
            const existingProduct = await transaction.product.findUnique({
              where: { id },
              select: {
                id: true,
                status: true,
                inventoryBalance: {
                  select: {
                    quantity: true,
                  },
                },
              },
            });

            if (!existingProduct) {
              throw new NotFoundException('Producto no encontrado');
            }

            if (!existingProduct.inventoryBalance) {
              throw new InternalServerErrorException(
                'El producto no tiene un balance de inventario',
              );
            }

            if (
              requestedStatus === ProductStatus.INACTIVE &&
              existingProduct.status !== ProductStatus.INACTIVE &&
              existingProduct.inventoryBalance.quantity > 0
            ) {
              throw new ConflictException(
                'No se puede desactivar un producto con stock disponible',
              );
            }

            return transaction.product.update({
              where: { id },
              data,
              select: productDetailSelect,
            });
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        if (isSerializableTransactionConflict(error)) {
          if (attempt === MAX_SERIALIZABLE_ATTEMPTS) {
            throw new ServiceUnavailableException(
              'No se pudo actualizar el producto por concurrencia',
            );
          }
          continue;
        }

        throw error;
      }
    }

    throw new ServiceUnavailableException(
      'No se pudo actualizar el producto por concurrencia',
    );
  }
}

import { ConflictException, Injectable } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createProductDto: CreateProductDto) {
    try {
      return await this.prisma.product.create({
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
        include: {
          inventoryBalance: true,
        },
      });
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
}

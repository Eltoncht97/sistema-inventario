import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../generated/prisma/client.js';
import { Currency } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { ProductsService } from './products.service.js';

describe('ProductsService', () => {
  let service: ProductsService;
  let prismaCreate: ReturnType<typeof vi.fn>;

  const dto: CreateProductDto = {
    sku: 'SKU-001',
    name: 'Producto de prueba',
    description: 'Descripción opcional',
    price: '10.50',
    currency: Currency.PEN,
  };

  beforeEach(async () => {
    prismaCreate = vi.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useValue: { product: { create: prismaCreate } },
        },
      ],
    }).compile();

    service = module.get(ProductsService);
  });

  it('creates a product and its initial inventory balance', async () => {
    const createdProduct = {
      id: 'product-id',
      sku: dto.sku,
      name: dto.name,
      description: dto.description,
      price: dto.price,
      currency: dto.currency,
      status: 'ACTIVE',
      inventoryBalance: { productId: 'product-id', quantity: 0 },
    };
    prismaCreate.mockResolvedValue(createdProduct);

    await expect(service.create(dto)).resolves.toBe(createdProduct);
    expect(prismaCreate).toHaveBeenCalledOnce();
    expect(prismaCreate).toHaveBeenCalledWith({
      data: {
        sku: dto.sku,
        name: dto.name,
        description: dto.description,
        price: dto.price,
        currency: dto.currency,
        inventoryBalance: {
          create: {},
        },
      },
      include: {
        inventoryBalance: true,
      },
    });
  });

  it('throws ConflictException when the SKU already exists', async () => {
    const duplicateError = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      {
        code: 'P2002',
        clientVersion: '7.10.0',
        meta: { target: ['sku'] },
      },
    );
    prismaCreate.mockRejectedValue(duplicateError);

    await expect(service.create(dto)).rejects.toMatchObject({
      constructor: ConflictException,
      message: 'Ya existe un producto con ese SKU',
    });
  });

  it('rethrows unexpected Prisma errors', async () => {
    const unexpectedError = new Error('Database unavailable');
    prismaCreate.mockRejectedValue(unexpectedError);

    await expect(service.create(dto)).rejects.toBe(unexpectedError);
  });
});

import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../generated/prisma/client.js';
import { Currency } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { ProductsService } from './products.service.js';

describe('ProductsService', () => {
  let service: ProductsService;
  let prismaCreate: ReturnType<typeof vi.fn>;
  let prismaFindMany: ReturnType<typeof vi.fn>;
  let prismaFindUnique: ReturnType<typeof vi.fn>;
  let prismaCount: ReturnType<typeof vi.fn>;
  let prismaTransaction: ReturnType<typeof vi.fn>;

  const dto: CreateProductDto = {
    sku: 'SKU-001',
    name: 'Producto de prueba',
    description: 'Descripción opcional',
    price: '10.50',
    currency: Currency.PEN,
  };

  beforeEach(async () => {
    prismaCreate = vi.fn();
    prismaFindMany = vi.fn();
    prismaFindUnique = vi.fn();
    prismaCount = vi.fn();
    prismaTransaction = vi.fn(async (operations: Promise<unknown>[]) =>
      Promise.all(operations),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useValue: {
            product: {
              create: prismaCreate,
              findMany: prismaFindMany,
              findUnique: prismaFindUnique,
              count: prismaCount,
            },
            $transaction: prismaTransaction,
          },
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

  it('finds a product by id including its inventory balance', async () => {
    const product = {
      id: 'd39a9913-0df9-486c-b025-0bc09e6cfc56',
      sku: 'IPHONE-17',
      name: 'iPhone 17',
      inventoryBalance: { quantity: 0 },
    };
    prismaFindUnique.mockResolvedValue(product);

    await expect(service.findOne(product.id)).resolves.toBe(product);
    expect(prismaFindUnique).toHaveBeenCalledWith({
      where: { id: product.id },
      select: {
        id: true,
        sku: true,
        name: true,
        price: true,
        currency: true,
        status: true,
        inventoryBalance: {
          select: {
            id: true,
            productId: true,
            quantity: true,
          },
        },
      },
    });
  });

  it('throws NotFoundException when a product does not exist', async () => {
    prismaFindUnique.mockResolvedValue(null);

    await expect(
      service.findOne('d39a9913-0df9-486c-b025-0bc09e6cfc56'),
    ).rejects.toMatchObject({
      constructor: NotFoundException,
      message: 'Producto no encontrado',
    });
  });

  it('lists filtered products with pagination and metadata', async () => {
    const products = [
      {
        id: 'product-id',
        sku: 'IPHONE-17',
        name: 'iPhone 17',
        inventoryBalance: { quantity: 0 },
      },
    ];
    prismaFindMany.mockResolvedValue(products);
    prismaCount.mockResolvedValue(21);

    await expect(
      service.findAll({
        page: 2,
        limit: 10,
        search: 'iphone',
        status: 'ACTIVE',
        currency: 'PEN',
      }),
    ).resolves.toEqual({
      data: products,
      meta: { page: 2, limit: 10, total: 21, totalPages: 3 },
    });

    const where = {
      OR: [
        { name: { contains: 'iphone', mode: 'insensitive' } },
        { sku: { contains: 'iphone', mode: 'insensitive' } },
      ],
      status: 'ACTIVE',
      currency: 'PEN',
    };
    expect(prismaFindMany).toHaveBeenCalledWith({
      where,
      skip: 10,
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        sku: true,
        name: true,
        price: true,
        currency: true,
        status: true,
        inventoryBalance: {
          select: {
            id: true,
            productId: true,
            quantity: true,
          },
        },
      },
    });
    expect(prismaCount).toHaveBeenCalledWith({ where });
    expect(prismaTransaction).toHaveBeenCalledOnce();
  });
});

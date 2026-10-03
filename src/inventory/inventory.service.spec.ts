import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { Prisma } from '../generated/prisma/client.js';
import {
  InventoryMovementType,
  ProductStatus,
} from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { InventoryService } from './inventory.service.js';
import { MAX_INVENTORY_QUANTITY } from './inventory.constants.js';
import {
  inventoryBalanceSelect,
  inventoryMovementSelect,
  type InventoryMovementRecord,
} from './inventory.select.js';

describe('InventoryService', () => {
  let service: InventoryService;
  let productFindUnique: ReturnType<typeof vi.fn>;
  let balanceUpdate: ReturnType<typeof vi.fn>;
  let movementFindUnique: ReturnType<typeof vi.fn>;
  let movementCreate: ReturnType<typeof vi.fn>;
  let movementFindMany: ReturnType<typeof vi.fn>;
  let movementCount: ReturnType<typeof vi.fn>;
  let prismaTransaction: ReturnType<typeof vi.fn>;

  const productId = randomUUID();
  const idempotencyKey = randomUUID();
  const transactionClient = () => ({
    product: { findUnique: productFindUnique },
    inventoryBalance: { update: balanceUpdate },
    inventoryMovement: {
      findUnique: movementFindUnique,
      create: movementCreate,
    },
  });
  const transactionImplementation = async (
    input:
      | Promise<unknown>[]
      | ((
          transaction: ReturnType<typeof transactionClient>,
        ) => Promise<unknown>),
  ) =>
    typeof input === 'function'
      ? input(transactionClient())
      : Promise.all(input);
  const movementRecord = (
    overrides: Partial<InventoryMovementRecord> = {},
  ): InventoryMovementRecord => ({
    id: randomUUID(),
    productId,
    type: InventoryMovementType.ENTRY,
    quantity: 5,
    delta: 5,
    quantityBefore: 3,
    quantityAfter: 8,
    reason: 'Compra',
    idempotencyKey,
    createdAt: new Date('2026-10-03T20:00:00.000Z'),
    ...overrides,
  });
  const activeProduct = (quantity = 3) => ({
    id: productId,
    status: ProductStatus.ACTIVE,
    inventoryBalance: { id: 'balance-id', quantity },
  });

  beforeEach(async () => {
    productFindUnique = vi.fn();
    balanceUpdate = vi.fn().mockResolvedValue({});
    movementFindUnique = vi.fn().mockResolvedValue(null);
    movementCreate = vi.fn();
    movementFindMany = vi.fn();
    movementCount = vi.fn();
    prismaTransaction = vi.fn(transactionImplementation);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: PrismaService,
          useValue: {
            product: { findUnique: productFindUnique },
            inventoryBalance: { update: balanceUpdate },
            inventoryMovement: {
              findUnique: movementFindUnique,
              create: movementCreate,
              findMany: movementFindMany,
              count: movementCount,
            },
            $transaction: prismaTransaction,
          },
        },
      ],
    }).compile();

    service = module.get(InventoryService);
  });

  it('returns the current inventory balance', async () => {
    productFindUnique.mockResolvedValue({
      id: productId,
      sku: 'SKU-001',
      name: 'Producto',
      status: ProductStatus.ACTIVE,
      inventoryBalance: {
        quantity: 8,
        updatedAt: new Date('2026-10-03T20:00:00.000Z'),
      },
    });

    await expect(service.getBalance(productId)).resolves.toEqual({
      productId,
      sku: 'SKU-001',
      name: 'Producto',
      status: ProductStatus.ACTIVE,
      quantity: 8,
      updatedAt: '2026-10-03T20:00:00.000Z',
    });
    expect(productFindUnique).toHaveBeenCalledWith({
      where: { id: productId },
      select: inventoryBalanceSelect,
    });
  });

  it('rejects a missing product when consulting balance', async () => {
    productFindUnique.mockResolvedValue(null);
    await expect(service.getBalance(productId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects a missing balance when consulting inventory', async () => {
    productFindUnique.mockResolvedValue({
      id: productId,
      sku: 'SKU-001',
      name: 'Producto',
      status: ProductStatus.ACTIVE,
      inventoryBalance: null,
    });
    await expect(service.getBalance(productId)).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });

  it('creates an entry and updates the balance atomically', async () => {
    const movement = movementRecord();
    productFindUnique.mockResolvedValue(activeProduct());
    movementCreate.mockResolvedValue(movement);

    await expect(
      service.createMovement(productId, {
        type: InventoryMovementType.ENTRY,
        quantity: 5,
        reason: '  Compra  ',
        idempotencyKey,
      }),
    ).resolves.toMatchObject({ delta: 5, quantityBefore: 3, quantityAfter: 8 });

    expect(balanceUpdate).toHaveBeenCalledWith({
      where: { id: 'balance-id' },
      data: { quantity: 8 },
    });
    expect(movementCreate).toHaveBeenCalledWith({
      data: {
        productId,
        type: InventoryMovementType.ENTRY,
        quantity: 5,
        delta: 5,
        quantityBefore: 3,
        quantityAfter: 8,
        reason: 'Compra',
        idempotencyKey,
      },
      select: inventoryMovementSelect,
    });
    expect(prismaTransaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  });

  it('rejects movement creation for a missing product', async () => {
    productFindUnique.mockResolvedValue(null);

    await expect(
      service.createMovement(productId, {
        type: InventoryMovementType.ENTRY,
        quantity: 1,
        idempotencyKey,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(balanceUpdate).not.toHaveBeenCalled();
    expect(movementCreate).not.toHaveBeenCalled();
  });

  it('calculates an exit', async () => {
    productFindUnique.mockResolvedValue(activeProduct(8));
    movementCreate.mockResolvedValue(
      movementRecord({
        type: InventoryMovementType.EXIT,
        quantity: 3,
        delta: -3,
        quantityBefore: 8,
        quantityAfter: 5,
        reason: null,
      }),
    );

    await service.createMovement(productId, {
      type: InventoryMovementType.EXIT,
      quantity: 3,
      idempotencyKey,
    });

    expect(balanceUpdate).toHaveBeenCalledWith({
      where: { id: 'balance-id' },
      data: { quantity: 5 },
    });
    expect(movementCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ delta: -3, quantityAfter: 5 }),
      }),
    );
  });

  it('rejects an exit with insufficient stock before writing', async () => {
    productFindUnique.mockResolvedValue(activeProduct(2));

    await expect(
      service.createMovement(productId, {
        type: InventoryMovementType.EXIT,
        quantity: 3,
        idempotencyKey,
      }),
    ).rejects.toMatchObject({
      constructor: ConflictException,
      message: 'Stock insuficiente',
    });
    expect(balanceUpdate).not.toHaveBeenCalled();
    expect(movementCreate).not.toHaveBeenCalled();
  });

  it('rejects a direct quantity above the supported maximum', async () => {
    await expect(
      service.createMovement(productId, {
        type: InventoryMovementType.ENTRY,
        quantity: MAX_INVENTORY_QUANTITY + 1,
        idempotencyKey,
      }),
    ).rejects.toMatchObject({
      constructor: BadRequestException,
      message: 'Cantidad de movimiento inválida',
    });
    expect(prismaTransaction).not.toHaveBeenCalled();
  });

  it('rejects an entry that would overflow the inventory balance', async () => {
    productFindUnique.mockResolvedValue(activeProduct(MAX_INVENTORY_QUANTITY));

    await expect(
      service.createMovement(productId, {
        type: InventoryMovementType.ENTRY,
        quantity: 1,
        idempotencyKey,
      }),
    ).rejects.toMatchObject({
      constructor: ConflictException,
      message: 'El balance de inventario excede la cantidad máxima permitida',
    });
    expect(balanceUpdate).not.toHaveBeenCalled();
    expect(movementCreate).not.toHaveBeenCalled();
  });

  it.each([
    [3, 8, 5],
    [8, 3, -5],
    [8, 8, 0],
  ])(
    'adjusts stock from %i to %i with delta %i',
    async (quantityBefore, quantityAfter, delta) => {
      productFindUnique.mockResolvedValue(activeProduct(quantityBefore));
      movementCreate.mockResolvedValue(
        movementRecord({
          type: InventoryMovementType.ADJUSTMENT,
          quantity: quantityAfter,
          delta,
          quantityBefore,
          quantityAfter,
          reason: 'Conteo físico',
        }),
      );

      await service.createMovement(productId, {
        type: InventoryMovementType.ADJUSTMENT,
        quantity: quantityAfter,
        reason: 'Conteo físico',
        idempotencyKey,
      });

      expect(movementCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ delta, quantityAfter }),
        }),
      );
    },
  );

  it('rejects movements for an inactive product without retrying', async () => {
    productFindUnique.mockResolvedValue({
      ...activeProduct(),
      status: ProductStatus.INACTIVE,
    });

    await expect(
      service.createMovement(productId, {
        type: InventoryMovementType.ENTRY,
        quantity: 1,
        idempotencyKey,
      }),
    ).rejects.toMatchObject({
      constructor: ConflictException,
      message: 'No se pueden registrar movimientos para un producto inactivo',
    });
    expect(prismaTransaction).toHaveBeenCalledOnce();
    expect(balanceUpdate).not.toHaveBeenCalled();
  });

  it('rejects a product without an inventory balance', async () => {
    productFindUnique.mockResolvedValue({
      id: productId,
      status: ProductStatus.ACTIVE,
      inventoryBalance: null,
    });

    await expect(
      service.createMovement(productId, {
        type: InventoryMovementType.ENTRY,
        quantity: 1,
        idempotencyKey,
      }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
    expect(balanceUpdate).not.toHaveBeenCalled();
  });

  it('returns an existing movement for an identical idempotent request', async () => {
    const movement = movementRecord();
    movementFindUnique.mockResolvedValue(movement);

    await expect(
      service.createMovement(productId, {
        type: movement.type,
        quantity: movement.quantity,
        reason: movement.reason ?? undefined,
        idempotencyKey,
      }),
    ).resolves.toMatchObject({ id: movement.id });
    expect(productFindUnique).not.toHaveBeenCalled();
    expect(balanceUpdate).not.toHaveBeenCalled();
    expect(movementCreate).not.toHaveBeenCalled();
  });

  it('rejects an idempotency key reused with different data', async () => {
    movementFindUnique.mockResolvedValue(movementRecord());

    await expect(
      service.createMovement(productId, {
        type: InventoryMovementType.ENTRY,
        quantity: 6,
        reason: 'Compra',
        idempotencyKey,
      }),
    ).rejects.toMatchObject({
      constructor: ConflictException,
      message: 'La clave de idempotencia ya fue utilizada con otra operación',
    });
    expect(balanceUpdate).not.toHaveBeenCalled();
  });

  it('resolves a concurrent idempotency unique conflict', async () => {
    const movement = movementRecord();
    const error = new Prisma.PrismaClientKnownRequestError('Unique conflict', {
      code: 'P2002',
      clientVersion: '7.10.0',
      meta: { target: ['idempotency_key'] },
    });
    prismaTransaction.mockRejectedValueOnce(error);
    movementFindUnique.mockResolvedValue(movement);

    await expect(
      service.createMovement(productId, {
        type: movement.type,
        quantity: movement.quantity,
        reason: movement.reason ?? undefined,
        idempotencyKey,
      }),
    ).resolves.toMatchObject({ id: movement.id });
  });

  it('does not treat an unrelated unique conflict as idempotency', async () => {
    const error = new Prisma.PrismaClientKnownRequestError('Unique conflict', {
      code: 'P2002',
      clientVersion: '7.10.0',
      meta: { target: ['other_field'] },
    });
    prismaTransaction.mockRejectedValueOnce(error);

    await expect(
      service.createMovement(productId, {
        type: InventoryMovementType.ENTRY,
        quantity: 1,
        idempotencyKey,
      }),
    ).rejects.toBe(error);
    expect(movementFindUnique).not.toHaveBeenCalled();
  });

  it('retries a serializable conflict', async () => {
    const error = new Prisma.PrismaClientKnownRequestError(
      'Transaction conflict',
      { code: 'P2034', clientVersion: '7.10.0' },
    );
    prismaTransaction
      .mockRejectedValueOnce(error)
      .mockImplementation(transactionImplementation);
    productFindUnique.mockResolvedValue(activeProduct());
    movementCreate.mockResolvedValue(movementRecord());

    await expect(
      service.createMovement(productId, {
        type: InventoryMovementType.ENTRY,
        quantity: 5,
        reason: 'Compra',
        idempotencyKey,
      }),
    ).resolves.toBeDefined();
    expect(prismaTransaction).toHaveBeenCalledTimes(2);
  });

  it('returns 503 after exhausting serializable retries', async () => {
    const error = new Prisma.PrismaClientKnownRequestError(
      'Transaction conflict',
      { code: 'P2034', clientVersion: '7.10.0' },
    );
    prismaTransaction.mockRejectedValue(error);

    await expect(
      service.createMovement(productId, {
        type: InventoryMovementType.ENTRY,
        quantity: 1,
        idempotencyKey,
      }),
    ).rejects.toMatchObject({
      constructor: ServiceUnavailableException,
      message: 'No se pudo actualizar el inventario por concurrencia',
    });
    expect(prismaTransaction).toHaveBeenCalledTimes(3);
  });

  it('returns filtered paginated movement history', async () => {
    const movements = [movementRecord()];
    productFindUnique.mockResolvedValue({ id: productId });
    movementFindMany.mockResolvedValue(movements);
    movementCount.mockResolvedValue(21);

    await expect(
      service.findMovements(productId, {
        page: 2,
        limit: 10,
        type: InventoryMovementType.ENTRY,
      }),
    ).resolves.toEqual({
      data: [
        expect.objectContaining({
          id: movements[0].id,
          createdAt: expect.any(String),
        }),
      ],
      meta: { page: 2, limit: 10, total: 21, totalPages: 3 },
    });
    const where = { productId, type: InventoryMovementType.ENTRY };
    expect(movementFindMany).toHaveBeenCalledWith({
      where,
      skip: 10,
      take: 10,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: inventoryMovementSelect,
    });
    expect(movementCount).toHaveBeenCalledWith({ where });
  });
});

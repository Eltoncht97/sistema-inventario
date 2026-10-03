import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { InventoryMovementType } from '../generated/prisma/enums.js';
import { InventoryController } from './inventory.controller.js';
import { InventoryService } from './inventory.service.js';

describe('InventoryController', () => {
  let controller: InventoryController;
  let getBalance: ReturnType<typeof vi.fn>;
  let createMovement: ReturnType<typeof vi.fn>;
  let findMovements: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    getBalance = vi.fn();
    createMovement = vi.fn();
    findMovements = vi.fn();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [
        {
          provide: InventoryService,
          useValue: { getBalance, createMovement, findMovements },
        },
      ],
    }).compile();

    controller = module.get(InventoryController);
  });

  it('delegates balance lookup', async () => {
    const productId = randomUUID();
    const result = { productId, quantity: 0 };
    getBalance.mockResolvedValue(result);

    await expect(controller.getBalance(productId)).resolves.toBe(result);
    expect(getBalance).toHaveBeenCalledWith(productId);
  });

  it('delegates movement creation', async () => {
    const productId = randomUUID();
    const dto = {
      type: InventoryMovementType.ENTRY,
      quantity: 5,
      idempotencyKey: randomUUID(),
    };
    const result = { productId, ...dto };
    createMovement.mockResolvedValue(result);

    await expect(controller.createMovement(productId, dto)).resolves.toBe(
      result,
    );
    expect(createMovement).toHaveBeenCalledWith(productId, dto);
  });

  it('delegates movement history lookup', async () => {
    const productId = randomUUID();
    const query = { page: 1, limit: 20 };
    const result = { data: [], meta: { ...query, total: 0, totalPages: 0 } };
    findMovements.mockResolvedValue(result);

    await expect(controller.findMovements(productId, query)).resolves.toBe(
      result,
    );
    expect(findMovements).toHaveBeenCalledWith(productId, query);
  });
});

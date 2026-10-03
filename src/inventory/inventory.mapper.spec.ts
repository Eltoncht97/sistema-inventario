import {
  InventoryMovementType,
  ProductStatus,
} from '../generated/prisma/enums.js';
import {
  toInventoryBalanceResponse,
  toInventoryMovementResponse,
} from './inventory.mapper.js';

describe('InventoryMapper', () => {
  it('maps a balance and converts its timestamp to ISO', () => {
    expect(
      toInventoryBalanceResponse({
        id: 'product-id',
        sku: 'SKU-001',
        name: 'Producto',
        status: ProductStatus.ACTIVE,
        inventoryBalance: {
          quantity: 8,
          updatedAt: new Date('2026-10-03T20:00:00.000Z'),
        },
      }),
    ).toEqual({
      productId: 'product-id',
      sku: 'SKU-001',
      name: 'Producto',
      status: ProductStatus.ACTIVE,
      quantity: 8,
      updatedAt: '2026-10-03T20:00:00.000Z',
    });
  });

  it('maps a movement explicitly', () => {
    expect(
      toInventoryMovementResponse({
        id: 'movement-id',
        productId: 'product-id',
        type: InventoryMovementType.ENTRY,
        quantity: 10,
        delta: 10,
        quantityBefore: 5,
        quantityAfter: 15,
        reason: 'Compra',
        idempotencyKey: 'key-id',
        createdAt: new Date('2026-10-03T20:00:00.000Z'),
      }),
    ).toEqual({
      id: 'movement-id',
      productId: 'product-id',
      type: InventoryMovementType.ENTRY,
      quantity: 10,
      delta: 10,
      quantityBefore: 5,
      quantityAfter: 15,
      reason: 'Compra',
      idempotencyKey: 'key-id',
      createdAt: '2026-10-03T20:00:00.000Z',
    });
  });
});

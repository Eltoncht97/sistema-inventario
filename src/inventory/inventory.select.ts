import { Prisma } from '../generated/prisma/client.js';

export const inventoryBalanceSelect = {
  id: true,
  sku: true,
  name: true,
  status: true,
  inventoryBalance: {
    select: {
      quantity: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.ProductSelect;

export const inventoryMovementSelect = {
  id: true,
  productId: true,
  type: true,
  quantity: true,
  delta: true,
  quantityBefore: true,
  quantityAfter: true,
  reason: true,
  idempotencyKey: true,
  createdAt: true,
} satisfies Prisma.InventoryMovementSelect;

export type InventoryBalanceRecord = Prisma.ProductGetPayload<{
  select: typeof inventoryBalanceSelect;
}>;

export type InventoryMovementRecord = Prisma.InventoryMovementGetPayload<{
  select: typeof inventoryMovementSelect;
}>;

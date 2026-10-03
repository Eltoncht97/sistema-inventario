import { InternalServerErrorException } from '@nestjs/common';
import type { InventoryBalanceResponseDto } from './dto/inventory-balance-response.dto.js';
import type { InventoryMovementResponseDto } from './dto/inventory-movement-response.dto.js';
import type {
  InventoryBalanceRecord,
  InventoryMovementRecord,
} from './inventory.select.js';

export const toInventoryBalanceResponse = (
  product: InventoryBalanceRecord,
): InventoryBalanceResponseDto => {
  if (!product.inventoryBalance) {
    throw new InternalServerErrorException(
      'El producto no tiene un balance de inventario',
    );
  }

  return {
    productId: product.id,
    sku: product.sku,
    name: product.name,
    status: product.status,
    quantity: product.inventoryBalance.quantity,
    updatedAt: product.inventoryBalance.updatedAt.toISOString(),
  };
};

export const toInventoryMovementResponse = (
  movement: InventoryMovementRecord,
): InventoryMovementResponseDto => ({
  id: movement.id,
  productId: movement.productId,
  type: movement.type,
  quantity: movement.quantity,
  delta: movement.delta,
  quantityBefore: movement.quantityBefore,
  quantityAfter: movement.quantityAfter,
  reason: movement.reason,
  idempotencyKey: movement.idempotencyKey,
  createdAt: movement.createdAt.toISOString(),
});

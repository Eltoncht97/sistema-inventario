import type { InventoryMovementType } from '../../generated/prisma/enums.js';

export class InventoryMovementResponseDto {
  id!: string;
  productId!: string;
  type!: InventoryMovementType;
  quantity!: number;
  delta!: number;
  quantityBefore!: number;
  quantityAfter!: number;
  reason!: string | null;
  idempotencyKey!: string;
  createdAt!: string;
}

import type { ProductStatus } from '../../generated/prisma/enums.js';

export class InventoryBalanceResponseDto {
  productId!: string;
  sku!: string;
  name!: string;
  status!: ProductStatus;
  quantity!: number;
  updatedAt!: string;
}

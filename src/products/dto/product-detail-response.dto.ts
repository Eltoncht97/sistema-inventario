import type { Currency, ProductStatus } from '../../generated/prisma/enums.js';

export class ProductInventoryBalanceResponseDto {
  quantity!: number;
}

export class ProductDetailResponseDto {
  id!: string;
  sku!: string;
  name!: string;
  description!: string | null;
  price!: string;
  currency!: Currency;
  status!: ProductStatus;
  inventoryBalance!: ProductInventoryBalanceResponseDto;
  createdAt!: string;
  updatedAt!: string;
}

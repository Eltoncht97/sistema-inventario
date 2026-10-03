import type { Currency, ProductStatus } from '../../generated/prisma/enums.js';
import type { ProductInventoryBalanceResponseDto } from './product-detail-response.dto.js';

export class ProductListItemResponseDto {
  id!: string;
  sku!: string;
  name!: string;
  price!: string;
  currency!: Currency;
  status!: ProductStatus;
  inventoryBalance!: ProductInventoryBalanceResponseDto;
}

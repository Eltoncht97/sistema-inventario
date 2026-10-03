import type { ProductListItemResponseDto } from './product-list-item-response.dto.js';

export class ProductsPaginationMetaDto {
  page!: number;
  limit!: number;
  total!: number;
  totalPages!: number;
}

export class PaginatedProductsResponseDto {
  data!: ProductListItemResponseDto[];
  meta!: ProductsPaginationMetaDto;
}

import type { InventoryMovementResponseDto } from './inventory-movement-response.dto.js';

export class InventoryMovementsPaginationMetaDto {
  page!: number;
  limit!: number;
  total!: number;
  totalPages!: number;
}

export class PaginatedInventoryMovementsResponseDto {
  data!: InventoryMovementResponseDto[];
  meta!: InventoryMovementsPaginationMetaDto;
}

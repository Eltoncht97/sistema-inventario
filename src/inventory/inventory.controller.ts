import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { CreateInventoryMovementDto } from './dto/create-inventory-movement.dto.js';
import type { InventoryBalanceResponseDto } from './dto/inventory-balance-response.dto.js';
import type { InventoryMovementResponseDto } from './dto/inventory-movement-response.dto.js';
import { ListInventoryMovementsQueryDto } from './dto/list-inventory-movements-query.dto.js';
import type { PaginatedInventoryMovementsResponseDto } from './dto/paginated-inventory-movements-response.dto.js';
import { InventoryService } from './inventory.service.js';

@Controller('products/:productId/inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  getBalance(
    @Param('productId', ParseUUIDPipe) productId: string,
  ): Promise<InventoryBalanceResponseDto> {
    return this.inventoryService.getBalance(productId);
  }

  @Post('movements')
  createMovement(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() createMovementDto: CreateInventoryMovementDto,
  ): Promise<InventoryMovementResponseDto> {
    return this.inventoryService.createMovement(productId, createMovementDto);
  }

  @Get('movements')
  findMovements(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query() query: ListInventoryMovementsQueryDto,
  ): Promise<PaginatedInventoryMovementsResponseDto> {
    return this.inventoryService.findMovements(productId, query);
  }
}

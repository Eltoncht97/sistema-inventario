import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import {
  InventoryMovementType,
  ProductStatus,
} from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateInventoryMovementDto } from './dto/create-inventory-movement.dto.js';
import type { InventoryBalanceResponseDto } from './dto/inventory-balance-response.dto.js';
import type { InventoryMovementResponseDto } from './dto/inventory-movement-response.dto.js';
import type { ListInventoryMovementsQueryDto } from './dto/list-inventory-movements-query.dto.js';
import type { PaginatedInventoryMovementsResponseDto } from './dto/paginated-inventory-movements-response.dto.js';
import {
  toInventoryBalanceResponse,
  toInventoryMovementResponse,
} from './inventory.mapper.js';
import {
  inventoryBalanceSelect,
  inventoryMovementSelect,
  type InventoryMovementRecord,
} from './inventory.select.js';

const MAX_SERIALIZABLE_ATTEMPTS = 3;

interface MovementCalculation {
  delta: number;
  quantityAfter: number;
}

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getBalance(productId: string): Promise<InventoryBalanceResponseDto> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: inventoryBalanceSelect,
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    return toInventoryBalanceResponse(product);
  }

  async createMovement(
    productId: string,
    createMovementDto: CreateInventoryMovementDto,
  ): Promise<InventoryMovementResponseDto> {
    const request: CreateInventoryMovementDto = {
      type: createMovementDto.type,
      quantity: createMovementDto.quantity,
      idempotencyKey: createMovementDto.idempotencyKey,
      reason:
        createMovementDto.reason === undefined
          ? undefined
          : createMovementDto.reason.trim(),
    };

    this.validateMovementRequest(request);

    for (let attempt = 1; attempt <= MAX_SERIALIZABLE_ATTEMPTS; attempt += 1) {
      try {
        const movement = await this.prisma.$transaction(
          async (transaction) => {
            const existingMovement =
              await transaction.inventoryMovement.findUnique({
                where: { idempotencyKey: request.idempotencyKey },
                select: inventoryMovementSelect,
              });

            if (existingMovement) {
              this.assertSameIdempotentRequest(
                existingMovement,
                productId,
                request,
              );
              return existingMovement;
            }

            const product = await transaction.product.findUnique({
              where: { id: productId },
              select: {
                id: true,
                status: true,
                inventoryBalance: {
                  select: {
                    id: true,
                    quantity: true,
                  },
                },
              },
            });

            if (!product) {
              throw new NotFoundException('Producto no encontrado');
            }

            if (product.status !== ProductStatus.ACTIVE) {
              throw new ConflictException(
                'No se pueden registrar movimientos para un producto inactivo',
              );
            }

            if (!product.inventoryBalance) {
              throw new InternalServerErrorException(
                'El producto no tiene un balance de inventario',
              );
            }

            const quantityBefore = product.inventoryBalance.quantity;
            const { delta, quantityAfter } = this.calculateMovement(
              request.type,
              request.quantity,
              quantityBefore,
            );

            await transaction.inventoryBalance.update({
              where: { id: product.inventoryBalance.id },
              data: { quantity: quantityAfter },
            });

            return transaction.inventoryMovement.create({
              data: {
                productId,
                type: request.type,
                quantity: request.quantity,
                delta,
                quantityBefore,
                quantityAfter,
                reason: request.reason,
                idempotencyKey: request.idempotencyKey,
              },
              select: inventoryMovementSelect,
            });
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );

        return toInventoryMovementResponse(movement);
      } catch (error) {
        if (this.isIdempotencyKeyConflict(error)) {
          const existingMovement =
            await this.prisma.inventoryMovement.findUnique({
              where: { idempotencyKey: request.idempotencyKey },
              select: inventoryMovementSelect,
            });

          if (!existingMovement) {
            throw error;
          }

          this.assertSameIdempotentRequest(
            existingMovement,
            productId,
            request,
          );
          return toInventoryMovementResponse(existingMovement);
        }

        if (this.isSerializableConflict(error)) {
          if (attempt === MAX_SERIALIZABLE_ATTEMPTS) {
            throw new ServiceUnavailableException(
              'No se pudo actualizar el inventario por concurrencia',
            );
          }
          continue;
        }

        throw error;
      }
    }

    throw new ServiceUnavailableException(
      'No se pudo actualizar el inventario por concurrencia',
    );
  }

  async findMovements(
    productId: string,
    query: ListInventoryMovementsQueryDto,
  ): Promise<PaginatedInventoryMovementsResponseDto> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    const { page, limit, type } = query;
    const where: Prisma.InventoryMovementWhereInput = {
      productId,
      ...(type ? { type } : {}),
    };
    const [movements, total] = await this.prisma.$transaction([
      this.prisma.inventoryMovement.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: inventoryMovementSelect,
      }),
      this.prisma.inventoryMovement.count({ where }),
    ]);

    return {
      data: movements.map(toInventoryMovementResponse),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private validateMovementRequest(request: CreateInventoryMovementDto): void {
    if (
      !Number.isInteger(request.quantity) ||
      request.quantity < 0 ||
      (request.type !== InventoryMovementType.ADJUSTMENT &&
        request.quantity === 0)
    ) {
      throw new BadRequestException('Cantidad de movimiento inválida');
    }

    if (
      request.type === InventoryMovementType.ADJUSTMENT &&
      !request.reason?.trim()
    ) {
      throw new BadRequestException(
        'El ajuste de inventario requiere una razón',
      );
    }
  }

  private calculateMovement(
    type: InventoryMovementType,
    quantity: number,
    quantityBefore: number,
  ): MovementCalculation {
    if (type === InventoryMovementType.ENTRY) {
      return { delta: quantity, quantityAfter: quantityBefore + quantity };
    }

    if (type === InventoryMovementType.EXIT) {
      if (quantity > quantityBefore) {
        throw new ConflictException('Stock insuficiente');
      }

      return { delta: -quantity, quantityAfter: quantityBefore - quantity };
    }

    return { delta: quantity - quantityBefore, quantityAfter: quantity };
  }

  private assertSameIdempotentRequest(
    movement: InventoryMovementRecord,
    productId: string,
    request: CreateInventoryMovementDto,
  ): void {
    if (
      movement.productId !== productId ||
      movement.type !== request.type ||
      movement.quantity !== request.quantity ||
      movement.reason !== (request.reason ?? null)
    ) {
      throw new ConflictException(
        'La clave de idempotencia ya fue utilizada con otra operación',
      );
    }
  }

  private isSerializableConflict(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2034'
    );
  }

  private isIdempotencyKeyConflict(error: unknown): boolean {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== 'P2002'
    ) {
      return false;
    }

    const target = error.meta?.target;
    const targets = Array.isArray(target) ? target : [target];

    return targets.some(
      (field) => field === 'idempotencyKey' || field === 'idempotency_key',
    );
  }
}

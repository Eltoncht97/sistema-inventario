import { Transform } from 'class-transformer';
import {
  IsDefined,
  IsEnum,
  IsInt,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  Validate,
  ValidateIf,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { InventoryMovementType } from '../../generated/prisma/enums.js';

@ValidatorConstraint({ name: 'validInventoryMovementQuantity' })
class ValidInventoryMovementQuantityConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, arguments_: ValidationArguments): boolean {
    if (typeof value !== 'number' || !Number.isInteger(value)) {
      return true;
    }

    const object = arguments_.object;
    if (!('type' in object)) {
      return true;
    }

    return object.type === InventoryMovementType.ADJUSTMENT
      ? value >= 0
      : value > 0;
  }

  defaultMessage(): string {
    return 'Cantidad de movimiento inválida';
  }
}

@ValidatorConstraint({ name: 'adjustmentRequiresReason' })
class AdjustmentRequiresReasonConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, arguments_: ValidationArguments): boolean {
    const object = arguments_.object;
    if (
      !('type' in object) ||
      object.type !== InventoryMovementType.ADJUSTMENT
    ) {
      return true;
    }

    return (
      'reason' in object &&
      typeof object.reason === 'string' &&
      object.reason.length > 0
    );
  }

  defaultMessage(): string {
    return 'El ajuste de inventario requiere una razón';
  }
}

export class CreateInventoryMovementDto {
  @IsDefined()
  @IsEnum(InventoryMovementType)
  @Validate(AdjustmentRequiresReasonConstraint)
  type!: InventoryMovementType;

  @IsDefined()
  @IsInt()
  @Min(0)
  @Validate(ValidInventoryMovementQuantityConstraint)
  quantity!: number;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsDefined()
  @IsUUID()
  idempotencyKey!: string;
}

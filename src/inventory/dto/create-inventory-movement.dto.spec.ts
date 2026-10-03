import {
  ArgumentMetadata,
  BadRequestException,
  ValidationPipe,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { InventoryMovementType } from '../../generated/prisma/enums.js';
import { CreateInventoryMovementDto } from './create-inventory-movement.dto.js';

describe('CreateInventoryMovementDto', () => {
  const validationPipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  const metadata: ArgumentMetadata = {
    type: 'body',
    metatype: CreateInventoryMovementDto,
  };
  const validMovement = {
    type: InventoryMovementType.ENTRY,
    quantity: 1,
    idempotencyKey: randomUUID(),
  };
  const validate = (body: Record<string, unknown>) =>
    validationPipe.transform(body, metadata);

  it.each(Object.values(InventoryMovementType))(
    'accepts the movement type %s',
    async (type) => {
      const body = {
        ...validMovement,
        type,
        ...(type === InventoryMovementType.ADJUSTMENT
          ? { reason: 'Conteo físico' }
          : {}),
      };

      await expect(validate(body)).resolves.toMatchObject({ type });
    },
  );

  it('rejects an invalid movement type', async () => {
    await expect(
      validate({ ...validMovement, type: 'TRANSFER' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([-1, 1.5, '1'])(
    'rejects the invalid quantity %j',
    async (quantity) => {
      await expect(
        validate({ ...validMovement, quantity }),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it.each([InventoryMovementType.ENTRY, InventoryMovementType.EXIT])(
    'rejects zero for %s',
    async (type) => {
      await expect(
        validate({ ...validMovement, type, quantity: 0 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it('accepts zero for an adjustment', async () => {
    await expect(
      validate({
        ...validMovement,
        type: InventoryMovementType.ADJUSTMENT,
        quantity: 0,
        reason: 'Conteo físico',
      }),
    ).resolves.toMatchObject({ quantity: 0 });
  });

  it.each([undefined, '', '   '])(
    'rejects an adjustment with reason %j',
    async (reason) => {
      await expect(
        validate({
          ...validMovement,
          type: InventoryMovementType.ADJUSTMENT,
          reason,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it('trims the reason', async () => {
    await expect(
      validate({ ...validMovement, reason: '  Compra al proveedor  ' }),
    ).resolves.toMatchObject({ reason: 'Compra al proveedor' });
  });

  it('rejects a reason longer than 500 characters', async () => {
    await expect(
      validate({ ...validMovement, reason: 'A'.repeat(501) }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([undefined, 'not-a-uuid'])(
    'rejects the idempotency key %j',
    async (idempotencyKey) => {
      await expect(
        validate({ ...validMovement, idempotencyKey }),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it('rejects unknown properties', async () => {
    await expect(
      validate({ ...validMovement, unknown: true }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

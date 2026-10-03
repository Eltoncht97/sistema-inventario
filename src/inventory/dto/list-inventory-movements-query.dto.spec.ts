import {
  ArgumentMetadata,
  BadRequestException,
  ValidationPipe,
} from '@nestjs/common';
import { InventoryMovementType } from '../../generated/prisma/enums.js';
import { ListInventoryMovementsQueryDto } from './list-inventory-movements-query.dto.js';

describe('ListInventoryMovementsQueryDto', () => {
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  const metadata: ArgumentMetadata = {
    type: 'query',
    metatype: ListInventoryMovementsQueryDto,
  };
  const validate = (query: Record<string, unknown>) =>
    pipe.transform(query, metadata);

  it('uses pagination defaults', async () => {
    await expect(validate({})).resolves.toMatchObject({ page: 1, limit: 20 });
  });

  it('accepts a valid type and pagination', async () => {
    await expect(
      validate({ page: '2', limit: '100', type: InventoryMovementType.EXIT }),
    ).resolves.toMatchObject({
      page: 2,
      limit: 100,
      type: InventoryMovementType.EXIT,
    });
  });

  it.each([{ page: 0 }, { limit: 101 }, { type: 'TRANSFER' }])(
    'rejects an invalid query',
    async (query) => {
      await expect(validate(query)).rejects.toBeInstanceOf(BadRequestException);
    },
  );
});

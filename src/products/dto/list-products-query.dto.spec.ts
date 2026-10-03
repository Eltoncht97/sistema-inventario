import {
  ArgumentMetadata,
  BadRequestException,
  ValidationPipe,
} from '@nestjs/common';
import { Currency, ProductStatus } from '../../generated/prisma/enums.js';
import { ListProductsQueryDto } from './list-products-query.dto.js';

describe('ListProductsQueryDto', () => {
  const validationPipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  const metadata: ArgumentMetadata = {
    type: 'query',
    metatype: ListProductsQueryDto,
  };

  const validate = (query: Record<string, unknown>) =>
    validationPipe.transform(query, metadata);

  it('uses the default pagination values', async () => {
    await expect(validate({})).resolves.toMatchObject({
      page: 1,
      limit: 20,
    });
  });

  it('converts page and limit to numbers', async () => {
    const result = await validate({ page: '2', limit: '50' });

    expect(result).toMatchObject({ page: 2, limit: 50 });
  });

  it.each([0, -1, 1.5, 'invalid'])(
    'rejects the invalid page %s',
    async (page) => {
      await expect(validate({ page })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    },
  );

  it.each([0, -1, 1.5, 101, 'invalid'])(
    'rejects the invalid limit %s',
    async (limit) => {
      await expect(validate({ limit })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    },
  );

  it('accepts the maximum limit', async () => {
    await expect(validate({ limit: '100' })).resolves.toMatchObject({
      limit: 100,
    });
  });

  it('trims the search value', async () => {
    await expect(validate({ search: '  iphone  ' })).resolves.toMatchObject({
      search: 'iphone',
    });
  });

  it('rejects a non-string search value', async () => {
    await expect(validate({ search: 123 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it.each([ProductStatus.ACTIVE, ProductStatus.INACTIVE])(
    'accepts %s as a valid status',
    async (status) => {
      await expect(validate({ status })).resolves.toMatchObject({ status });
    },
  );

  it.each([Currency.PEN, Currency.USD])(
    'accepts %s as a valid currency',
    async (currency) => {
      await expect(validate({ currency })).resolves.toMatchObject({ currency });
    },
  );

  it('rejects an invalid status', async () => {
    await expect(validate({ status: 'DELETED' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects an invalid currency', async () => {
    await expect(validate({ currency: 'EUR' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects unknown properties', async () => {
    await expect(validate({ unknown: 'value' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('returns an instance of ListProductsQueryDto', async () => {
    const result = await validate({});

    expect(result).toBeInstanceOf(ListProductsQueryDto);
  });
});

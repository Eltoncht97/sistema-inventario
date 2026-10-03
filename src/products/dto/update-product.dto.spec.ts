import {
  ArgumentMetadata,
  BadRequestException,
  ValidationPipe,
} from '@nestjs/common';
import { Currency, ProductStatus } from '../../generated/prisma/enums.js';
import { UpdateProductDto } from './update-product.dto.js';

describe('UpdateProductDto', () => {
  const validationPipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  const metadata: ArgumentMetadata = {
    type: 'body',
    metatype: UpdateProductDto,
  };

  const validate = (body: Record<string, unknown>) =>
    validationPipe.transform(body, metadata);

  it.each([
    ['name', 'Producto actualizado'],
    ['description', 'Nueva descripción'],
    ['price', '10.50'],
    ['currency', Currency.USD],
    ['status', ProductStatus.INACTIVE],
  ])('accepts the allowed field %s individually', async (field, value) => {
    await expect(validate({ [field]: value })).resolves.toMatchObject({
      [field]: value,
    });
  });

  it('trims name and description', async () => {
    await expect(
      validate({
        name: '  Producto actualizado  ',
        description: '  Nueva descripción  ',
      }),
    ).resolves.toMatchObject({
      name: 'Producto actualizado',
      description: 'Nueva descripción',
    });
  });

  it('accepts null to clear the description', async () => {
    await expect(validate({ description: null })).resolves.toMatchObject({
      description: null,
    });
  });

  it.each(['', '   ', 123])('rejects the invalid name %j', async (name) => {
    await expect(validate({ name })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it.each(['-1.00', '10.123', 10.5])(
    'rejects the invalid price %j',
    async (price) => {
      await expect(validate({ price })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    },
  );

  it('rejects an invalid currency', async () => {
    await expect(validate({ currency: 'EUR' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects an invalid status', async () => {
    await expect(validate({ status: 'DELETED' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it.each([{ sku: 'NEW-SKU' }, { unknown: 'value' }])(
    'rejects a forbidden property',
    async (body) => {
      await expect(validate(body)).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it('returns an instance of UpdateProductDto', async () => {
    await expect(validate({ name: 'Producto' })).resolves.toBeInstanceOf(
      UpdateProductDto,
    );
  });
});

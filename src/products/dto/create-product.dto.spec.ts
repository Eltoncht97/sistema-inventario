import {
  ArgumentMetadata,
  BadRequestException,
  ValidationPipe,
} from '@nestjs/common';
import { Currency } from '../../generated/prisma/enums.js';
import { CreateProductDto } from './create-product.dto.js';

describe('CreateProductDto', () => {
  const validationPipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  const metadata: ArgumentMetadata = {
    type: 'body',
    metatype: CreateProductDto,
  };
  const validProduct = {
    sku: 'SKU-001',
    name: 'Producto de prueba',
    price: '10.50',
    currency: Currency.PEN,
  };

  const validate = (body: Record<string, unknown>) =>
    validationPipe.transform(body, metadata);

  it('accepts a valid product without description', async () => {
    await expect(validate(validProduct)).resolves.toMatchObject(validProduct);
  });

  it.each([Currency.PEN, Currency.USD])(
    'accepts %s as a valid currency',
    async (currency) => {
      await expect(
        validate({ ...validProduct, currency }),
      ).resolves.toMatchObject({ currency });
    },
  );

  it('trims sku, name and description', async () => {
    const result = await validate({
      ...validProduct,
      sku: '  sku-001  ',
      name: '  Producto de prueba  ',
      description: '  Descripción opcional  ',
    });

    expect(result).toMatchObject({
      sku: 'SKU-001',
      name: 'Producto de prueba',
      description: 'Descripción opcional',
    });
  });

  it('converts sku to uppercase', async () => {
    const result = await validate({ ...validProduct, sku: 'sku-abc-123' });

    expect(result).toMatchObject({ sku: 'SKU-ABC-123' });
  });

  it.each(['0', '0.00', '10', '10.5', '10.50', '9999999999.99'])(
    'accepts the valid price %s',
    async (price) => {
      await expect(validate({ ...validProduct, price })).resolves.toMatchObject(
        {
          price,
        },
      );
    },
  );

  it.each(['-1.00', '10.123', '10000000000.00', 'abc', '', 10.5])(
    'rejects the invalid price %s',
    async (price) => {
      await expect(validate({ ...validProduct, price })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    },
  );

  it.each(['', '   '])('rejects the empty sku %j', async (sku) => {
    await expect(validate({ ...validProduct, sku })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects a sku longer than 64 characters', async () => {
    await expect(
      validate({ ...validProduct, sku: 'A'.repeat(65) }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each(['', '   '])('rejects the empty name %j', async (name) => {
    await expect(validate({ ...validProduct, name })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects a name longer than 160 characters', async () => {
    await expect(
      validate({ ...validProduct, name: 'A'.repeat(161) }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a non-string name with BadRequestException', async () => {
    await expect(
      validate({ ...validProduct, name: 123 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a non-string description', async () => {
    await expect(
      validate({ ...validProduct, description: 123 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an invalid currency', async () => {
    await expect(
      validate({ ...validProduct, currency: 'EUR' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects unknown properties', async () => {
    await expect(
      validate({ ...validProduct, unknown: 'value' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns an instance of CreateProductDto', async () => {
    const result = await validate(validProduct);

    expect(result).toBeInstanceOf(CreateProductDto);
  });
});

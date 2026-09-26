import {
  ArgumentMetadata,
  BadRequestException,
  ValidationPipe,
} from '@nestjs/common';
import { CreateProductDto, Currency } from './create-product.dto.js';

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
    description: 'Descripción opcional',
    price: '10.50',
    currency: Currency.PEN,
  };

  it('accepts a valid body and transforms it into the DTO', async () => {
    const result = await validationPipe.transform(validProduct, metadata);

    expect(result).toBeInstanceOf(CreateProductDto);
    expect(result).toEqual(validProduct);
  });

  it('rejects an invalid currency', async () => {
    await expect(
      validationPipe.transform({ ...validProduct, currency: 'EUR' }, metadata),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a price with three decimals', async () => {
    await expect(
      validationPipe.transform({ ...validProduct, price: '10.123' }, metadata),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an unknown property', async () => {
    await expect(
      validationPipe.transform({ ...validProduct, unknown: 'value' }, metadata),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

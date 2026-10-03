import { Prisma } from '../generated/prisma/client.js';
import { Currency, ProductStatus } from '../generated/prisma/enums.js';
import {
  toProductDetailResponse,
  toProductListItemResponse,
} from './products.mapper.js';
import type {
  ProductDetailRecord,
  ProductListRecord,
} from './products.select.js';

describe('ProductsMapper', () => {
  const createdAt = new Date('2026-10-03T20:00:00.000Z');
  const updatedAt = new Date('2026-10-03T21:00:00.000Z');

  const detailRecord = (price: string): ProductDetailRecord => ({
    id: '359dcf3d-69c1-45ec-bb0e-b55096f18fdf',
    sku: 'IPAD-AI-10',
    name: 'iPad Air 10',
    description: 'Descripción opcional',
    price: new Prisma.Decimal(price),
    currency: Currency.PEN,
    status: ProductStatus.ACTIVE,
    inventoryBalance: { quantity: 0 },
    createdAt,
    updatedAt,
  });

  it('maps the detailed contract explicitly', () => {
    expect(toProductDetailResponse(detailRecord('10.5'))).toEqual({
      id: '359dcf3d-69c1-45ec-bb0e-b55096f18fdf',
      sku: 'IPAD-AI-10',
      name: 'iPad Air 10',
      description: 'Descripción opcional',
      price: '10.50',
      currency: Currency.PEN,
      status: ProductStatus.ACTIVE,
      inventoryBalance: { quantity: 0 },
      createdAt: '2026-10-03T20:00:00.000Z',
      updatedAt: '2026-10-03T21:00:00.000Z',
    });
  });

  it('formats an integer price with exactly two decimals', () => {
    expect(toProductDetailResponse(detailRecord('4000')).price).toBe('4000.00');
  });

  it('maps only public list fields and only the balance quantity', () => {
    const record: ProductListRecord = {
      id: '359dcf3d-69c1-45ec-bb0e-b55096f18fdf',
      sku: 'IPAD-AI-10',
      name: 'iPad Air 10',
      price: new Prisma.Decimal('4000'),
      currency: Currency.PEN,
      status: ProductStatus.ACTIVE,
      inventoryBalance: { quantity: 0 },
    };

    const response = toProductListItemResponse(record);

    expect(response).toEqual({
      id: record.id,
      sku: record.sku,
      name: record.name,
      price: '4000.00',
      currency: record.currency,
      status: record.status,
      inventoryBalance: { quantity: 0 },
    });
    expect(response).not.toHaveProperty('description');
    expect(response).not.toHaveProperty('createdAt');
    expect(response).not.toHaveProperty('updatedAt');
    expect(response.inventoryBalance).not.toHaveProperty('id');
    expect(response.inventoryBalance).not.toHaveProperty('productId');
    expect(response.inventoryBalance).not.toHaveProperty('createdAt');
    expect(response.inventoryBalance).not.toHaveProperty('updatedAt');
  });
});

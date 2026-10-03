import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { cleanE2EDatabase } from './helpers/e2e-database.js';

describe('Application (e2e)', () => {
  let app: INestApplication<App>;
  let httpServer: App;
  let prisma: PrismaService;

  const buildValidProduct = () => ({
    sku: 'TEST-PRODUCT-001',
    name: 'Producto de prueba',
    price: '10.50',
    currency: 'PEN',
  });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    httpServer = app.getHttpServer() as App;
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await cleanE2EDatabase(prisma);
  });

  it('GET /health responds with the application status', () => {
    return request(httpServer)
      .get('/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('POST /products creates a product with an initial balance of zero', async () => {
    const product = { ...buildValidProduct(), price: '4000' };

    const response = await request(httpServer)
      .post('/products')
      .send(product)
      .expect(201);

    expect(response.body).toEqual({
      id: expect.any(String),
      sku: product.sku.toUpperCase(),
      name: product.name,
      description: null,
      price: '4000.00',
      currency: product.currency,
      status: 'ACTIVE',
      inventoryBalance: {
        quantity: 0,
      },
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });

    expect(new Date(response.body.createdAt).toISOString()).toBe(
      response.body.createdAt,
    );
    expect(new Date(response.body.updatedAt).toISOString()).toBe(
      response.body.updatedAt,
    );
    expect(response.body.inventoryBalance).not.toHaveProperty('id');
    expect(response.body.inventoryBalance).not.toHaveProperty('productId');
  });

  it('POST /products rejects an unknown property', () => {
    return request(httpServer)
      .post('/products')
      .send({ ...buildValidProduct(), unknown: 'value' })
      .expect(400);
  });

  it('POST /products rejects a non-string name with 400', () => {
    return request(httpServer)
      .post('/products')
      .send({ ...buildValidProduct(), name: 123 })
      .expect(400);
  });

  it('POST /products rejects an invalid currency', () => {
    return request(httpServer)
      .post('/products')
      .send({ ...buildValidProduct(), currency: 'EUR' })
      .expect(400);
  });

  it('POST /products rejects a negative price', () => {
    return request(httpServer)
      .post('/products')
      .send({ ...buildValidProduct(), price: '-1.00' })
      .expect(400);
  });

  it('POST /products rejects a price with more than two decimals', () => {
    return request(httpServer)
      .post('/products')
      .send({ ...buildValidProduct(), price: '10.123' })
      .expect(400);
  });

  it('POST /products returns 409 when the SKU already exists', async () => {
    const product = buildValidProduct();

    await request(httpServer).post('/products').send(product).expect(201);

    await request(httpServer)
      .post('/products')
      .send(product)
      .expect(409)
      .expect(({ body }) => {
        expect(body.message).toBe('Ya existe un producto con ese SKU');
      });
  });

  it('GET /products/:id returns an existing product with its balance', async () => {
    const product = buildValidProduct();
    const created = await request(httpServer)
      .post('/products')
      .send(product)
      .expect(201);

    const response = await request(httpServer)
      .get(`/products/${created.body.id}`)
      .expect(200);

    expect(response.body).toEqual({
      id: created.body.id,
      sku: product.sku.toUpperCase(),
      name: product.name,
      description: null,
      price: '10.50',
      currency: product.currency,
      status: 'ACTIVE',
      inventoryBalance: {
        quantity: 0,
      },
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it('GET /products/:id returns 404 for an unknown UUID', () => {
    return request(httpServer).get(`/products/${randomUUID()}`).expect(404);
  });

  it('GET /products/:id returns 400 when the id is not a UUID', () => {
    return request(httpServer).get('/products/not-a-uuid').expect(400);
  });

  it('GET /products returns filtered products and pagination metadata', async () => {
    const product = buildValidProduct();
    const created = await request(httpServer)
      .post('/products')
      .send(product)
      .expect(201);

    const response = await request(httpServer)
      .get('/products')
      .query({
        page: 1,
        limit: 20,
        search: product.sku.toLowerCase(),
        status: 'ACTIVE',
        currency: 'PEN',
      })
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toEqual({
      id: created.body.id,
      sku: product.sku.toUpperCase(),
      name: product.name,
      price: '10.50',
      currency: product.currency,
      status: 'ACTIVE',
      inventoryBalance: {
        quantity: 0,
      },
    });
    expect(response.body.data[0]).not.toHaveProperty('description');
    expect(response.body.data[0]).not.toHaveProperty('createdAt');
    expect(response.body.data[0]).not.toHaveProperty('updatedAt');
    expect(response.body.data[0].inventoryBalance).not.toHaveProperty('id');
    expect(response.body.data[0].inventoryBalance).not.toHaveProperty(
      'productId',
    );
    expect(response.body.meta).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
  });

  it('GET /products rejects a limit greater than 100', () => {
    return request(httpServer).get('/products?limit=101').expect(400);
  });

  it('PATCH /products/:id updates fields and returns the detailed contract', async () => {
    const product = {
      ...buildValidProduct(),
      description: 'Descripción original',
    };
    const created = await request(httpServer)
      .post('/products')
      .send(product)
      .expect(201);

    const response = await request(httpServer)
      .patch(`/products/${created.body.id}`)
      .send({
        name: '  Producto actualizado  ',
        description: null,
        price: '4200',
        currency: 'USD',
      })
      .expect(200);

    expect(response.body).toEqual({
      id: created.body.id,
      sku: product.sku,
      name: 'Producto actualizado',
      description: null,
      price: '4200.00',
      currency: 'USD',
      status: 'ACTIVE',
      inventoryBalance: { quantity: 0 },
      createdAt: created.body.createdAt,
      updatedAt: expect.any(String),
    });
    expect(response.body.inventoryBalance).not.toHaveProperty('id');
    expect(response.body.inventoryBalance).not.toHaveProperty('productId');
  });

  it('PATCH /products/:id rejects sku changes and preserves the original SKU', async () => {
    const product = buildValidProduct();
    const created = await request(httpServer)
      .post('/products')
      .send(product)
      .expect(201);

    await request(httpServer)
      .patch(`/products/${created.body.id}`)
      .send({ sku: 'NEW-SKU' })
      .expect(400);

    const response = await request(httpServer)
      .get(`/products/${created.body.id}`)
      .expect(200);
    expect(response.body.sku).toBe(product.sku);
  });

  it('PATCH /products/:id rejects an empty body', async () => {
    const created = await request(httpServer)
      .post('/products')
      .send(buildValidProduct())
      .expect(201);

    await request(httpServer)
      .patch(`/products/${created.body.id}`)
      .send({})
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toBe(
          'Debe enviar al menos un campo para actualizar',
        );
      });
  });

  it('PATCH /products/:id rejects an invalid id', () => {
    return request(httpServer)
      .patch('/products/not-a-uuid')
      .send({ name: 'Producto actualizado' })
      .expect(400);
  });

  it('PATCH /products/:id returns 404 for an unknown UUID', () => {
    return request(httpServer)
      .patch(`/products/${randomUUID()}`)
      .send({ name: 'Producto actualizado' })
      .expect(404);
  });

  it('PATCH /products/:id allows deactivation with zero stock and reactivation', async () => {
    const created = await request(httpServer)
      .post('/products')
      .send(buildValidProduct())
      .expect(201);

    const deactivated = await request(httpServer)
      .patch(`/products/${created.body.id}`)
      .send({ status: 'INACTIVE' })
      .expect(200);
    expect(deactivated.body.status).toBe('INACTIVE');

    const reactivated = await request(httpServer)
      .patch(`/products/${created.body.id}`)
      .send({ status: 'ACTIVE' })
      .expect(200);
    expect(reactivated.body.status).toBe('ACTIVE');
  });

  it('PATCH /products/:id rejects deactivation when stock is positive', async () => {
    const created = await request(httpServer)
      .post('/products')
      .send(buildValidProduct())
      .expect(201);
    await prisma.inventoryBalance.update({
      where: { productId: created.body.id },
      data: { quantity: 1 },
    });

    await request(httpServer)
      .patch(`/products/${created.body.id}`)
      .send({ status: 'INACTIVE' })
      .expect(409)
      .expect(({ body }) => {
        expect(body.message).toBe(
          'No se puede desactivar un producto con stock disponible',
        );
      });
  });

  afterAll(async () => {
    await app.close();
  });
});

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { randomUUID } from 'node:crypto';

describe('Application (e2e)', () => {
  let app: INestApplication<App>;
  let httpServer: App;

  const buildValidProduct = () => ({
    sku: `TEST-${randomUUID()}`,
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
  });

  it('GET /health responds with the application status', () => {
    return request(httpServer)
      .get('/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('POST /products creates a product with an initial balance of zero', async () => {
    const product = buildValidProduct();

    const response = await request(httpServer)
      .post('/products')
      .send(product)
      .expect(201);

    expect(response.body).toMatchObject({
      sku: product.sku.toUpperCase(),
      name: product.name,
      price: String(Number(product.price)),
      currency: product.currency,
      status: 'ACTIVE',
      inventoryBalance: {
        quantity: 0,
      },
    });

    expect(response.body.id).toBeDefined();
    expect(response.body.inventoryBalance.productId).toBe(response.body.id);
  });

  it('POST /products accepts a valid body', () => {
    return request(httpServer)
      .post('/products')
      .send(buildValidProduct())
      .expect(201);
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

  afterAll(async () => {
    await app.close();
  });
});

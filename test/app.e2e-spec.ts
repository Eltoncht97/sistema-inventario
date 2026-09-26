import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';

describe('Application (e2e)', () => {
  let app: INestApplication<App>;
  let httpServer: App;

  const validProduct = {
    sku: 'SKU-001',
    name: 'Producto de prueba',
    price: '10.50',
    currency: 'PEN',
  };

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

  it('POST /products accepts a valid body', () => {
    return request(httpServer).post('/products').send(validProduct).expect(201);
  });

  it('POST /products rejects an unknown property', () => {
    return request(httpServer)
      .post('/products')
      .send({ ...validProduct, unknown: 'value' })
      .expect(400);
  });

  it('POST /products rejects a non-string name with 400', () => {
    return request(httpServer)
      .post('/products')
      .send({ ...validProduct, name: 123 })
      .expect(400);
  });

  it('POST /products rejects an invalid currency', () => {
    return request(httpServer)
      .post('/products')
      .send({ ...validProduct, currency: 'EUR' })
      .expect(400);
  });

  it('POST /products rejects a negative price', () => {
    return request(httpServer)
      .post('/products')
      .send({ ...validProduct, price: '-1.00' })
      .expect(400);
  });

  it('POST /products rejects a price with more than two decimals', () => {
    return request(httpServer)
      .post('/products')
      .send({ ...validProduct, price: '10.123' })
      .expect(400);
  });

  afterAll(async () => {
    await app.close();
  });
});

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { cleanE2EDatabase } from './helpers/e2e-database.js';
import { MAX_INVENTORY_QUANTITY } from '../src/inventory/inventory.constants.js';

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

  const createProduct = async () =>
    request(httpServer).post('/products').send(buildValidProduct()).expect(201);

  const postMovement = (
    productId: string,
    body: {
      type: 'ENTRY' | 'EXIT' | 'ADJUSTMENT';
      quantity: number;
      reason?: string;
      idempotencyKey: string;
    },
  ) =>
    request(httpServer)
      .post(`/products/${productId}/inventory/movements`)
      .send(body);

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

  it('GET /products/:productId/inventory returns the initial zero balance', async () => {
    const created = await createProduct();

    const response = await request(httpServer)
      .get(`/products/${created.body.id}/inventory`)
      .expect(200);

    expect(response.body).toEqual({
      productId: created.body.id,
      sku: created.body.sku,
      name: created.body.name,
      status: 'ACTIVE',
      quantity: 0,
      updatedAt: expect.any(String),
    });
  });

  it('registers an entry and exposes the resulting balance', async () => {
    const created = await createProduct();
    const idempotencyKey = randomUUID();

    const movement = await postMovement(created.body.id, {
      type: 'ENTRY',
      quantity: 10,
      reason: '  Compra al proveedor  ',
      idempotencyKey,
    }).expect(201);

    expect(movement.body).toEqual({
      id: expect.any(String),
      productId: created.body.id,
      type: 'ENTRY',
      quantity: 10,
      delta: 10,
      quantityBefore: 0,
      quantityAfter: 10,
      reason: 'Compra al proveedor',
      idempotencyKey,
      createdAt: expect.any(String),
    });
    await request(httpServer)
      .get(`/products/${created.body.id}/inventory`)
      .expect(200)
      .expect(({ body }) => expect(body.quantity).toBe(10));
  });

  it('rejects a movement quantity above the supported maximum', async () => {
    const created = await createProduct();

    await postMovement(created.body.id, {
      type: 'ENTRY',
      quantity: MAX_INVENTORY_QUANTITY + 1,
      idempotencyKey: randomUUID(),
    }).expect(400);
  });

  it('rejects an entry that would overflow the inventory balance', async () => {
    const created = await createProduct();
    await postMovement(created.body.id, {
      type: 'ENTRY',
      quantity: MAX_INVENTORY_QUANTITY,
      idempotencyKey: randomUUID(),
    }).expect(201);

    await postMovement(created.body.id, {
      type: 'ENTRY',
      quantity: 1,
      idempotencyKey: randomUUID(),
    }).expect(409);

    const balance = await request(httpServer)
      .get(`/products/${created.body.id}/inventory`)
      .expect(200);
    expect(balance.body.quantity).toBe(MAX_INVENTORY_QUANTITY);
  });

  it('registers an exit and rejects insufficient stock', async () => {
    const created = await createProduct();
    await postMovement(created.body.id, {
      type: 'ENTRY',
      quantity: 8,
      idempotencyKey: randomUUID(),
    }).expect(201);

    const exit = await postMovement(created.body.id, {
      type: 'EXIT',
      quantity: 3,
      idempotencyKey: randomUUID(),
    }).expect(201);
    expect(exit.body).toMatchObject({
      delta: -3,
      quantityBefore: 8,
      quantityAfter: 5,
    });

    await postMovement(created.body.id, {
      type: 'EXIT',
      quantity: 6,
      idempotencyKey: randomUUID(),
    })
      .expect(409)
      .expect(({ body }) => expect(body.message).toBe('Stock insuficiente'));
  });

  it.each([
    [10, 15, 5],
    [10, 4, -6],
    [10, 0, -10],
    [10, 10, 0],
  ])(
    'adjusts inventory from %i to %i with delta %i',
    async (quantityBefore, quantityAfter, delta) => {
      const created = await createProduct();
      await postMovement(created.body.id, {
        type: 'ENTRY',
        quantity: quantityBefore,
        idempotencyKey: randomUUID(),
      }).expect(201);

      const adjustment = await postMovement(created.body.id, {
        type: 'ADJUSTMENT',
        quantity: quantityAfter,
        reason: 'Conteo físico',
        idempotencyKey: randomUUID(),
      }).expect(201);

      expect(adjustment.body).toMatchObject({
        type: 'ADJUSTMENT',
        quantity: quantityAfter,
        delta,
        quantityBefore,
        quantityAfter,
        reason: 'Conteo físico',
      });
    },
  );

  it('rejects an adjustment without a reason', async () => {
    const created = await createProduct();

    await postMovement(created.body.id, {
      type: 'ADJUSTMENT',
      quantity: 0,
      idempotencyKey: randomUUID(),
    }).expect(400);
  });

  it('rejects movements for an inactive product', async () => {
    const created = await createProduct();
    await request(httpServer)
      .patch(`/products/${created.body.id}`)
      .send({ status: 'INACTIVE' })
      .expect(200);

    await postMovement(created.body.id, {
      type: 'ENTRY',
      quantity: 1,
      idempotencyKey: randomUUID(),
    })
      .expect(409)
      .expect(({ body }) =>
        expect(body.message).toBe(
          'No se pueden registrar movimientos para un producto inactivo',
        ),
      );
  });

  it('returns ordered movement history and filters by type', async () => {
    const created = await createProduct();
    await postMovement(created.body.id, {
      type: 'ENTRY',
      quantity: 5,
      idempotencyKey: randomUUID(),
    }).expect(201);
    await postMovement(created.body.id, {
      type: 'EXIT',
      quantity: 2,
      idempotencyKey: randomUUID(),
    }).expect(201);

    const history = await request(httpServer)
      .get(`/products/${created.body.id}/inventory/movements`)
      .expect(200);
    expect(history.body.data).toHaveLength(2);
    expect(history.body.meta).toEqual({
      page: 1,
      limit: 20,
      total: 2,
      totalPages: 1,
    });
    expect(
      new Date(history.body.data[0].createdAt).getTime(),
    ).toBeGreaterThanOrEqual(
      new Date(history.body.data[1].createdAt).getTime(),
    );

    const filtered = await request(httpServer)
      .get(`/products/${created.body.id}/inventory/movements`)
      .query({ type: 'EXIT' })
      .expect(200);
    expect(filtered.body.data).toHaveLength(1);
    expect(filtered.body.data[0].type).toBe('EXIT');
  });

  it('paginates movement history', async () => {
    const created = await createProduct();
    for (let index = 0; index < 3; index += 1) {
      await postMovement(created.body.id, {
        type: 'ENTRY',
        quantity: 1,
        idempotencyKey: randomUUID(),
      }).expect(201);
    }

    const response = await request(httpServer)
      .get(`/products/${created.body.id}/inventory/movements`)
      .query({ page: 2, limit: 2 })
      .expect(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.meta).toEqual({
      page: 2,
      limit: 2,
      total: 3,
      totalPages: 2,
    });
  });

  it('returns the same movement for an identical idempotent request', async () => {
    const created = await createProduct();
    const movement = {
      type: 'ENTRY' as const,
      quantity: 5,
      reason: 'Compra',
      idempotencyKey: randomUUID(),
    };

    const first = await postMovement(created.body.id, movement).expect(201);
    const repeated = await postMovement(created.body.id, movement).expect(201);

    expect(repeated.body.id).toBe(first.body.id);
    await request(httpServer)
      .get(`/products/${created.body.id}/inventory`)
      .expect(200)
      .expect(({ body }) => expect(body.quantity).toBe(5));
  });

  it('rejects an idempotency key reused with different data', async () => {
    const created = await createProduct();
    const idempotencyKey = randomUUID();
    await postMovement(created.body.id, {
      type: 'ENTRY',
      quantity: 5,
      idempotencyKey,
    }).expect(201);

    await postMovement(created.body.id, {
      type: 'ENTRY',
      quantity: 6,
      idempotencyKey,
    })
      .expect(409)
      .expect(({ body }) =>
        expect(body.message).toBe(
          'La clave de idempotencia ya fue utilizada con otra operación',
        ),
      );
  });

  it('handles concurrent requests with the same idempotency key once', async () => {
    const created = await createProduct();
    const movement = {
      type: 'ENTRY' as const,
      quantity: 5,
      idempotencyKey: randomUUID(),
    };

    const [first, second] = await Promise.all([
      postMovement(created.body.id, movement),
      postMovement(created.body.id, movement),
    ]);
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.id).toBe(second.body.id);

    const balance = await request(httpServer)
      .get(`/products/${created.body.id}/inventory`)
      .expect(200);
    expect(balance.body.quantity).toBe(5);
  });

  it('prevents negative stock under concurrent exits', async () => {
    const created = await createProduct();
    await postMovement(created.body.id, {
      type: 'ENTRY',
      quantity: 5,
      idempotencyKey: randomUUID(),
    }).expect(201);

    const [first, second] = await Promise.all([
      postMovement(created.body.id, {
        type: 'EXIT',
        quantity: 4,
        idempotencyKey: randomUUID(),
      }),
      postMovement(created.body.id, {
        type: 'EXIT',
        quantity: 4,
        idempotencyKey: randomUUID(),
      }),
    ]);
    expect(
      [first.status, second.status].sort((left, right) => left - right),
    ).toEqual([201, 409]);

    const balance = await request(httpServer)
      .get(`/products/${created.body.id}/inventory`)
      .expect(200);
    expect(balance.body.quantity).toBe(1);

    const movements = await prisma.inventoryMovement.findMany({
      where: { productId: created.body.id },
    });
    expect(movements).toHaveLength(2);
    const entry = movements.find((movement) => movement.type === 'ENTRY');
    const exit = movements.find((movement) => movement.type === 'EXIT');
    expect(entry).toMatchObject({
      quantityBefore: 0,
      quantityAfter: 5,
    });
    expect(exit).toMatchObject({
      quantityBefore: 5,
      quantityAfter: 1,
    });
  });

  it('serializes concurrent deactivation and inventory entry', async () => {
    const created = await createProduct();

    const [deactivation, entryResponse] = await Promise.all([
      request(httpServer)
        .patch(`/products/${created.body.id}`)
        .send({ status: 'INACTIVE' }),
      postMovement(created.body.id, {
        type: 'ENTRY',
        quantity: 1,
        idempotencyKey: randomUUID(),
      }),
    ]);

    const statuses = [deactivation.status, entryResponse.status];
    expect(statuses.filter((status) => status === 409)).toHaveLength(1);
    expect(
      statuses.filter((status) => status === 200 || status === 201),
    ).toHaveLength(1);

    const product = await prisma.product.findUniqueOrThrow({
      where: { id: created.body.id },
      select: {
        status: true,
        inventoryBalance: { select: { quantity: true } },
        inventoryMovements: {
          select: {
            type: true,
            quantityBefore: true,
            quantityAfter: true,
          },
        },
      },
    });
    expect(product.inventoryBalance).not.toBeNull();

    if (product.status === 'INACTIVE') {
      expect(product.inventoryBalance?.quantity).toBe(0);
      expect(product.inventoryMovements).toHaveLength(0);
    } else {
      expect(product.status).toBe('ACTIVE');
      expect(product.inventoryBalance?.quantity).toBe(1);
      expect(product.inventoryMovements).toEqual([
        {
          type: 'ENTRY',
          quantityBefore: 0,
          quantityAfter: 1,
        },
      ]);
    }
  });

  it('inventory endpoints validate product UUIDs', async () => {
    await request(httpServer).get('/products/not-a-uuid/inventory').expect(400);
    await postMovement('not-a-uuid', {
      type: 'ENTRY',
      quantity: 1,
      idempotencyKey: randomUUID(),
    }).expect(400);
  });

  it('inventory endpoints return 404 for an unknown product', async () => {
    const productId = randomUUID();
    await request(httpServer)
      .get(`/products/${productId}/inventory`)
      .expect(404);
    await postMovement(productId, {
      type: 'ENTRY',
      quantity: 1,
      idempotencyKey: randomUUID(),
    }).expect(404);
  });

  afterAll(async () => {
    await app.close();
  });
});

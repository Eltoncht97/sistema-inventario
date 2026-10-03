import {
  cleanE2EDatabase,
  type E2EDatabaseCleaner,
  validateE2EDatabaseEnvironment,
} from './e2e-database.js';

describe('e2e database safety', () => {
  const safeEnvironment = {
    NODE_ENV: 'test',
    DATABASE_URL:
      'postgresql://inventory_e2e:inventory_e2e@localhost:5433/inventory_e2e?schema=public',
  };

  it('accepts NODE_ENV=test and the exact inventory_e2e database', () => {
    expect(() => validateE2EDatabaseEnvironment(safeEnvironment)).not.toThrow();
  });

  it('rejects an environment other than test', () => {
    expect(() =>
      validateE2EDatabaseEnvironment({
        ...safeEnvironment,
        NODE_ENV: 'development',
      }),
    ).toThrow('NODE_ENV=test');
  });

  it('rejects a missing DATABASE_URL', () => {
    expect(() => validateE2EDatabaseEnvironment({ NODE_ENV: 'test' })).toThrow(
      'DATABASE_URL',
    );
  });

  it.each(['inventory', 'inventory_e2e_backup'])(
    'rejects the database %s',
    (databaseName) => {
      expect(() =>
        validateE2EDatabaseEnvironment({
          NODE_ENV: 'test',
          DATABASE_URL: `postgresql://user:password@localhost:5433/${databaseName}`,
        }),
      ).toThrow('solo puede ejecutarse sobre inventory_e2e');
    },
  );

  it('validates safety before deleting and cleans in relation order', async () => {
    const inventoryMovementDeleteMany = vi.fn().mockResolvedValue({ count: 0 });
    const inventoryBalanceDeleteMany = vi.fn().mockResolvedValue({ count: 0 });
    const productDeleteMany = vi.fn().mockResolvedValue({ count: 0 });
    const prisma: E2EDatabaseCleaner = {
      inventoryMovement: { deleteMany: inventoryMovementDeleteMany },
      inventoryBalance: { deleteMany: inventoryBalanceDeleteMany },
      product: { deleteMany: productDeleteMany },
    };

    await expect(
      cleanE2EDatabase(prisma, {
        NODE_ENV: 'development',
        DATABASE_URL: safeEnvironment.DATABASE_URL,
      }),
    ).rejects.toThrow('NODE_ENV=test');
    expect(inventoryMovementDeleteMany).not.toHaveBeenCalled();
    expect(inventoryBalanceDeleteMany).not.toHaveBeenCalled();
    expect(productDeleteMany).not.toHaveBeenCalled();

    await cleanE2EDatabase(prisma, safeEnvironment);

    expect(inventoryMovementDeleteMany).toHaveBeenCalledOnce();
    expect(inventoryBalanceDeleteMany).toHaveBeenCalledOnce();
    expect(productDeleteMany).toHaveBeenCalledOnce();
    expect(
      inventoryMovementDeleteMany.mock.invocationCallOrder[0],
    ).toBeLessThan(inventoryBalanceDeleteMany.mock.invocationCallOrder[0]);
    expect(inventoryBalanceDeleteMany.mock.invocationCallOrder[0]).toBeLessThan(
      productDeleteMany.mock.invocationCallOrder[0],
    );
  });
});

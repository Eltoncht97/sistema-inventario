export interface E2EDatabaseEnvironment {
  NODE_ENV?: string;
  DATABASE_URL?: string;
}

export interface E2EDatabaseCleaner {
  inventoryMovement: {
    deleteMany(): Promise<unknown>;
  };
  inventoryBalance: {
    deleteMany(): Promise<unknown>;
  };
  product: {
    deleteMany(): Promise<unknown>;
  };
}

export const validateE2EDatabaseEnvironment = (
  environment: E2EDatabaseEnvironment,
): void => {
  if (environment.NODE_ENV !== 'test') {
    throw new Error('La limpieza e2e requiere NODE_ENV=test');
  }

  if (!environment.DATABASE_URL) {
    throw new Error('La limpieza e2e requiere DATABASE_URL');
  }

  let databaseUrl: URL;

  try {
    databaseUrl = new URL(environment.DATABASE_URL);
  } catch {
    throw new Error('DATABASE_URL e2e no es una URL válida');
  }

  const databaseName = decodeURIComponent(databaseUrl.pathname.slice(1));

  if (databaseName !== 'inventory_e2e') {
    throw new Error(
      `La limpieza e2e solo puede ejecutarse sobre inventory_e2e; base recibida: ${databaseName || '(vacía)'}`,
    );
  }
};

export const cleanE2EDatabase = async (
  prisma: E2EDatabaseCleaner,
  environment: E2EDatabaseEnvironment = process.env,
): Promise<void> => {
  validateE2EDatabaseEnvironment(environment);

  await prisma.inventoryMovement.deleteMany();
  await prisma.inventoryBalance.deleteMany();
  await prisma.product.deleteMany();
};

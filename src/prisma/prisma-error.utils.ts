import { Prisma } from '../generated/prisma/client.js';

const isRecord = (value: unknown): value is Record<PropertyKey, unknown> =>
  typeof value === 'object' && value !== null;

export const isSerializableTransactionConflict = (error: unknown): boolean => {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2034'
  ) {
    return true;
  }

  if (!isRecord(error) || error.name !== 'DriverAdapterError') {
    return false;
  }

  const cause = error.cause;

  return isRecord(cause) && cause.kind === 'TransactionWriteConflict';
};

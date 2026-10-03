import { Prisma } from '../generated/prisma/client.js';
import { isSerializableTransactionConflict } from './prisma-error.utils.js';

describe('isSerializableTransactionConflict', () => {
  it('recognizes Prisma P2034 errors', () => {
    const error = new Prisma.PrismaClientKnownRequestError(
      'Transaction conflict',
      { code: 'P2034', clientVersion: '7.10.0' },
    );

    expect(isSerializableTransactionConflict(error)).toBe(true);
  });

  it('recognizes adapter transaction write conflicts', () => {
    expect(
      isSerializableTransactionConflict({
        name: 'DriverAdapterError',
        cause: {
          kind: 'TransactionWriteConflict',
          originalCode: '40001',
        },
      }),
    ).toBe(true);
  });

  it('rejects other adapter errors', () => {
    expect(
      isSerializableTransactionConflict({
        name: 'DriverAdapterError',
        cause: { kind: 'UniqueConstraintViolation', originalCode: '23505' },
      }),
    ).toBe(false);
  });

  it.each([
    new Error('Database unavailable'),
    null,
    'TransactionWriteConflict',
    40001,
    {},
  ])('rejects unrelated value %#', (error) => {
    expect(isSerializableTransactionConflict(error)).toBe(false);
  });
});

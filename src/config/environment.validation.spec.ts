import { environmentValidationSchema } from './environment.validation.js';

describe('environmentValidationSchema', () => {
  it('accepts a valid environment and applies the default port', () => {
    const { error, value } = environmentValidationSchema.validate({
      DATABASE_URL: 'postgresql://user:password@localhost:5432/database',
    });

    expect(error).toBeUndefined();
    expect(value.PORT).toBe(3000);
  });

  it('rejects an environment without DATABASE_URL', () => {
    const { error } = environmentValidationSchema.validate({});

    expect(error?.message).toContain('DATABASE_URL');
  });

  it('rejects an invalid port', () => {
    const { error } = environmentValidationSchema.validate({
      DATABASE_URL: 'postgresql://user:password@localhost:5432/database',
      PORT: 70000,
    });

    expect(error?.message).toContain('PORT');
  });
});

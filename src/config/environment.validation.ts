import Joi from 'joi';

export const environmentValidationSchema = Joi.object({
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: Joi.string().uri().required(),
});

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { environmentValidationSchema } from './config/environment.validation.js';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validationSchema: environmentValidationSchema,
    }),
    PrismaModule,
    HealthModule,
  ],
})
export class AppModule {}

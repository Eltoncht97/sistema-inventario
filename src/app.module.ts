import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_PIPE } from '@nestjs/core';
import { environmentValidationSchema } from './config/environment.validation.js';
import { HealthModule } from './health/health.module.js';
import { ProductsModule } from './products/products.module.js';
import { InventoryModule } from './inventory/inventory.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validationSchema: environmentValidationSchema,
    }),
    HealthModule,
    ProductsModule,
    InventoryModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useFactory: () =>
        new ValidationPipe({
          transform: true,
          whitelist: true,
          forbidNonWhitelisted: true,
        }),
    },
  ],
})
export class AppModule {}

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProductsController } from './products.controller.js';
import { ProductsModule } from './products.module.js';
import { ProductsService } from './products.service.js';

describe('ProductsModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [ProductsModule],
    })
      .overrideProvider(PrismaService)
      .useValue({ product: { create: vi.fn() } })
      .compile();
  });

  it('provides ProductsController', () => {
    expect(module.get(ProductsController)).toBeInstanceOf(ProductsController);
  });

  it('provides ProductsService', () => {
    expect(module.get(ProductsService)).toBeInstanceOf(ProductsService);
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service.js';
import { InventoryController } from './inventory.controller.js';
import { InventoryModule } from './inventory.module.js';
import { InventoryService } from './inventory.service.js';

describe('InventoryModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({ imports: [InventoryModule] })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();
  });

  it('provides InventoryController', () => {
    expect(module.get(InventoryController)).toBeInstanceOf(InventoryController);
  });

  it('provides InventoryService', () => {
    expect(module.get(InventoryService)).toBeInstanceOf(InventoryService);
  });
});

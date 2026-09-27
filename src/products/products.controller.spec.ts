import { Test, TestingModule } from '@nestjs/testing';
import { Currency } from '../generated/prisma/enums.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { ProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';

describe('ProductsController', () => {
  let controller: ProductsController;
  let createProduct: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    createProduct = vi.fn();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: { create: createProduct },
        },
      ],
    }).compile();

    controller = module.get(ProductsController);
  });

  it('delegates product creation to ProductsService and returns its result', async () => {
    const dto: CreateProductDto = {
      sku: 'SKU-001',
      name: 'Producto de prueba',
      description: 'Descripción opcional',
      price: '10.50',
      currency: Currency.PEN,
    };
    const createdProduct = {
      id: 'product-id',
      sku: dto.sku,
      name: dto.name,
      description: dto.description,
      price: dto.price,
      currency: dto.currency,
      status: 'ACTIVE',
      inventoryBalance: { productId: 'product-id', quantity: 0 },
    };
    createProduct.mockResolvedValue(createdProduct);

    await expect(controller.create(dto)).resolves.toBe(createdProduct);
    expect(createProduct).toHaveBeenCalledOnce();
    expect(createProduct).toHaveBeenCalledWith(dto);
  });
});

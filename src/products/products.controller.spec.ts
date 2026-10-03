import { Test, TestingModule } from '@nestjs/testing';
import { Currency } from '../generated/prisma/enums.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { ListProductsQueryDto } from './dto/list-products-query.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { ProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';

describe('ProductsController', () => {
  let controller: ProductsController;
  let createProduct: ReturnType<typeof vi.fn>;
  let findAllProducts: ReturnType<typeof vi.fn>;
  let findOneProduct: ReturnType<typeof vi.fn>;
  let updateProduct: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    createProduct = vi.fn();
    findAllProducts = vi.fn();
    findOneProduct = vi.fn();
    updateProduct = vi.fn();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: {
            create: createProduct,
            findAll: findAllProducts,
            findOne: findOneProduct,
            update: updateProduct,
          },
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
      inventoryBalance: { quantity: 0 },
      createdAt: '2026-10-03T20:00:00.000Z',
      updatedAt: '2026-10-03T20:00:00.000Z',
    };
    createProduct.mockResolvedValue(createdProduct);

    await expect(controller.create(dto)).resolves.toBe(createdProduct);
    expect(createProduct).toHaveBeenCalledOnce();
    expect(createProduct).toHaveBeenCalledWith(dto);
  });

  it('delegates product listing to ProductsService', async () => {
    const query: ListProductsQueryDto = {
      page: 1,
      limit: 20,
      search: 'iphone',
    };
    const result = {
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    };
    findAllProducts.mockResolvedValue(result);

    await expect(controller.findAll(query)).resolves.toBe(result);
    expect(findAllProducts).toHaveBeenCalledWith(query);
  });

  it('delegates product lookup to ProductsService', async () => {
    const id = 'd39a9913-0df9-486c-b025-0bc09e6cfc56';
    const product = { id, inventoryBalance: { quantity: 0 } };
    findOneProduct.mockResolvedValue(product);

    await expect(controller.findOne(id)).resolves.toBe(product);
    expect(findOneProduct).toHaveBeenCalledWith(id);
  });

  it('delegates product updates to ProductsService and returns its result', async () => {
    const id = 'd39a9913-0df9-486c-b025-0bc09e6cfc56';
    const dto: UpdateProductDto = { name: 'Producto actualizado' };
    const product = { id, name: dto.name, inventoryBalance: { quantity: 0 } };
    updateProduct.mockResolvedValue(product);

    await expect(controller.update(id, dto)).resolves.toBe(product);
    expect(updateProduct).toHaveBeenCalledOnce();
    expect(updateProduct).toHaveBeenCalledWith(id, dto);
  });
});

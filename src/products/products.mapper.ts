import type { ProductDetailResponseDto } from './dto/product-detail-response.dto.js';
import type { ProductListItemResponseDto } from './dto/product-list-item-response.dto.js';
import type {
  ProductDetailRecord,
  ProductListRecord,
} from './products.select.js';

const inventoryQuantity = (
  inventoryBalance: { quantity: number } | null,
): number => {
  if (!inventoryBalance) {
    throw new Error('El producto no tiene un balance de inventario');
  }

  return inventoryBalance.quantity;
};

export const toProductDetailResponse = (
  product: ProductDetailRecord,
): ProductDetailResponseDto => ({
  id: product.id,
  sku: product.sku,
  name: product.name,
  description: product.description,
  price: product.price.toFixed(2),
  currency: product.currency,
  status: product.status,
  inventoryBalance: {
    quantity: inventoryQuantity(product.inventoryBalance),
  },
  createdAt: product.createdAt.toISOString(),
  updatedAt: product.updatedAt.toISOString(),
});

export const toProductListItemResponse = (
  product: ProductListRecord,
): ProductListItemResponseDto => ({
  id: product.id,
  sku: product.sku,
  name: product.name,
  price: product.price.toFixed(2),
  currency: product.currency,
  status: product.status,
  inventoryBalance: {
    quantity: inventoryQuantity(product.inventoryBalance),
  },
});

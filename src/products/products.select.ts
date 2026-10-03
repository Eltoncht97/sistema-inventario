import { Prisma } from '../generated/prisma/client.js';

export const productDetailSelect = {
  id: true,
  sku: true,
  name: true,
  description: true,
  price: true,
  currency: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  inventoryBalance: {
    select: {
      quantity: true,
    },
  },
} satisfies Prisma.ProductSelect;

export const productListSelect = {
  id: true,
  sku: true,
  name: true,
  price: true,
  currency: true,
  status: true,
  inventoryBalance: {
    select: {
      quantity: true,
    },
  },
} satisfies Prisma.ProductSelect;

export type ProductDetailRecord = Prisma.ProductGetPayload<{
  select: typeof productDetailSelect;
}>;

export type ProductListRecord = Prisma.ProductGetPayload<{
  select: typeof productListSelect;
}>;

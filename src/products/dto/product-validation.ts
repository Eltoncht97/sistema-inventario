export const PRODUCT_NAME_MAX_LENGTH = 160;

export const PRODUCT_PRICE_PATTERN = /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/;

export const PRODUCT_PRICE_MESSAGE =
  'price must be a non-negative decimal with at most ten integer digits and two decimal digits';

export const trimProductText = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim() : value;

import { Transform } from 'class-transformer';
import {
  IsDecimal,
  IsEnum,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  ValidateIf,
} from 'class-validator';
import { Currency, ProductStatus } from '../../generated/prisma/enums.js';
import {
  PRODUCT_NAME_MAX_LENGTH,
  PRODUCT_PRICE_MESSAGE,
  PRODUCT_PRICE_PATTERN,
  trimProductText,
} from './product-validation.js';

export class UpdateProductDto {
  @Transform(({ value }) => trimProductText(value))
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @Length(1, PRODUCT_NAME_MAX_LENGTH)
  name?: string;

  @Transform(({ value }) => trimProductText(value))
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsString()
  description?: string | null;

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @IsDecimal({ decimal_digits: '0,2', force_decimal: false })
  @Matches(PRODUCT_PRICE_PATTERN, {
    message: PRODUCT_PRICE_MESSAGE,
  })
  price?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsEnum(Currency)
  currency?: Currency;

  @ValidateIf((_, value) => value !== undefined)
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}

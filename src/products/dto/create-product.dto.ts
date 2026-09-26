import {
  IsDecimal,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { Currency } from '../../generated/prisma/enums.js';
import { Transform } from 'class-transformer';

export class CreateProductDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @IsNotEmpty()
  @Length(1, 64)
  sku!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @Length(1, 160)
  name!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  @IsDecimal({ decimal_digits: '0,2', force_decimal: false })
  @Matches(/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/, {
    message:
      'price must be a non-negative decimal with at most ten integer digits and two decimal digits',
  })
  price!: string;

  @IsEnum(Currency)
  currency!: Currency;
}

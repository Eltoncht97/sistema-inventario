import {
  IsDecimal,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export enum Currency {
  PEN = 'PEN',
  USD = 'USD',
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 64)
  sku!: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 160)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  @IsDecimal({ decimal_digits: '0,2', force_decimal: false })
  @Matches(/^\d+(?:\.\d{1,2})?$/, {
    message: 'price must be a non-negative decimal with at most two decimals',
  })
  price!: string;

  @IsEnum(Currency)
  currency!: Currency;
}

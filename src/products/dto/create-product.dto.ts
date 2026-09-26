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

  @Transform(({ value }) => value.trim())
  @IsString()
  @IsNotEmpty()
  @Length(1, 64)
  sku!: string;
  
  @Transform(({ value }) => value.trim())
  @IsString()
  @IsNotEmpty()
  @Length(1, 160)
  name!: string;
  
  @Transform(({ value }) => value.trim())
  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  @IsDecimal({ decimal_digits: '0,2', force_decimal: false })
  price!: string;

  @IsEnum(Currency)
  currency!: Currency;
}

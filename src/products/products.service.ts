import { Injectable } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto.js';

@Injectable()
export class ProductsService {
  create(createProductDto: CreateProductDto): void {
    console.log(createProductDto);
  }
}

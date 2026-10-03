import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto.js';
import { ListProductsQueryDto } from './dto/list-products-query.dto.js';
import { ProductsService } from './products.service.js';
import type { ProductDetailResponseDto } from './dto/product-detail-response.dto.js';
import type { PaginatedProductsResponseDto } from './dto/paginated-products-response.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(
    @Body() createProductDto: CreateProductDto,
  ): Promise<ProductDetailResponseDto> {
    return this.productsService.create(createProductDto);
  }

  @Get()
  findAll(
    @Query() query: ListProductsQueryDto,
  ): Promise<PaginatedProductsResponseDto> {
    return this.productsService.findAll(query);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProductDetailResponseDto> {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<ProductDetailResponseDto> {
    return this.productsService.update(id, updateProductDto);
  }
}

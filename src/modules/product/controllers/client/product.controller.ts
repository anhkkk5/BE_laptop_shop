import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '../../../../common/decorators/public.decorator.js';
import { ProductService } from '../../services/product.service.js';
import { QueryProductDto } from '../../dtos/query-product.dto.js';

@Controller('products')
@Public()
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  async findActive(@Query() query: QueryProductDto) {
    return this.productService.findActive(query);
  }

  @Get('featured')
  async findFeatured() {
    return this.productService.findFeatured();
  }

  @Get(':slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.productService.findBySlug(slug);
  }
}

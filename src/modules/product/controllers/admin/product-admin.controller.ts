import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { Roles } from '../../../../common/decorators/roles.decorator.js';
import { UserRole } from '../../../user/enums/user-role.enum.js';
import { ProductService } from '../../services/product.service.js';
import { CreateProductDto } from '../../dtos/create-product.dto.js';
import { UpdateProductDto } from '../../dtos/update-product.dto.js';
import { QueryProductDto } from '../../dtos/query-product.dto.js';

@Controller('admin/products')
@Roles(UserRole.ADMIN)
export class ProductAdminController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  async findAll(@Query() query: QueryProductDto) {
    return this.productService.findAll(query);
  }

  @Get('inventory-summary')
  async getInventorySummary() {
    return this.productService.getInventorySummary();
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.productService.findById(id);
  }

  @Post()
  async create(@Body() dto: CreateProductDto) {
    return this.productService.create(dto);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
  ) {
    await this.productService.update(id, dto);
    return { message: 'Product updated successfully' };
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.productService.delete(id);
    return { message: 'Product deleted successfully' };
  }
}

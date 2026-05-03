import {
  BadRequestException,
  Controller,
  ForbiddenException,
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
import { CurrentUser } from '../../../../common/decorators/index.js';
import { UserRole } from '../../../../common/constants/index.js';
import { ProductService } from '../../services/product.service.js';
import { CreateProductDto } from '../../dtos/create-product.dto.js';
import { UpdateProductDto } from '../../dtos/update-product.dto.js';
import { QueryProductDto } from '../../dtos/query-product.dto.js';

@Controller('admin/products')
@Roles(UserRole.ADMIN, UserRole.WAREHOUSE, UserRole.SELLER)
export class ProductAdminController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  async findAll(@Query() query: QueryProductDto) {
    return this.productService.findAll(query);
  }

  @Get('inventory-summary')
  async getInventorySummary(@Query('lowStockThreshold') threshold?: string) {
    if (threshold === undefined) {
      return this.productService.getInventorySummary();
    }

    const parsedThreshold = Number(threshold);
    if (!Number.isInteger(parsedThreshold) || parsedThreshold <= 0) {
      throw new BadRequestException(
        'lowStockThreshold must be a positive integer',
      );
    }

    return this.productService.getInventorySummary(parsedThreshold);
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.productService.findById(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  async create(
    @CurrentUser() user: { id: number; role: UserRole },
    @Body() dto: CreateProductDto,
  ) {
    if (user.role === UserRole.SELLER) {
      dto.sellerId = user.id;
    }
    return this.productService.create(dto);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  async update(
    @CurrentUser() user: { id: number; role: UserRole },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
  ) {
    if (user.role === UserRole.SELLER) {
      const product = await this.productService.findById(id);
      if (product.sellerId !== user.id) {
        throw new ForbiddenException('Bạn chỉ được sửa sản phẩm của mình');
      }
    }
    await this.productService.update(id, dto);
    return { message: 'Product updated successfully' };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  async delete(
    @CurrentUser() user: { id: number; role: UserRole },
    @Param('id', ParseIntPipe) id: number,
  ) {
    if (user.role === UserRole.SELLER) {
      const product = await this.productService.findById(id);
      if (product.sellerId !== user.id) {
        throw new ForbiddenException('Bạn chỉ được xóa sản phẩm của mình');
      }
    }
    await this.productService.delete(id);
    return { message: 'Product deleted successfully' };
  }
}

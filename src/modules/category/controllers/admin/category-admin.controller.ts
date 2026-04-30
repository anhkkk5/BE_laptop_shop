import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { Roles } from '../../../../common/decorators/roles.decorator.js';
import { UserRole } from '../../../user/enums/user-role.enum.js';
import { CategoryService } from '../../services/category.service.js';
import { CreateCategoryDto } from '../../dtos/create-category.dto.js';
import { UpdateCategoryDto } from '../../dtos/update-category.dto.js';

@Controller('admin/categories')
@Roles(UserRole.ADMIN)
export class CategoryAdminController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  async findAll() {
    return this.categoryService.findAll();
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.categoryService.findById(id);
  }

  @Post()
  async create(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
  ) {
    await this.categoryService.update(id, dto);
    return { message: 'Category updated successfully' };
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.categoryService.delete(id);
    return { message: 'Category deleted successfully' };
  }
}

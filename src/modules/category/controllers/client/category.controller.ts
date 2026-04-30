import { Controller, Get, Param } from '@nestjs/common';
import { Public } from '../../../../common/decorators/public.decorator.js';
import { CategoryService } from '../../services/category.service.js';

@Controller('categories')
@Public()
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  async findActive() {
    return this.categoryService.findActiveRoots();
  }

  @Get(':slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.categoryService.findBySlug(slug);
  }
}

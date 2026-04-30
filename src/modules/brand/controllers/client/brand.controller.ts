import { Controller, Get, Param } from '@nestjs/common';
import { Public } from '../../../../common/decorators/public.decorator.js';
import { BrandService } from '../../services/brand.service.js';

@Controller('brands')
@Public()
export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  @Get()
  async findActive() {
    return this.brandService.findActive();
  }

  @Get(':slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.brandService.findBySlug(slug);
  }
}

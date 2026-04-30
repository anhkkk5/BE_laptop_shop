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
import { BrandService } from '../../services/brand.service.js';
import { CreateBrandDto } from '../../dtos/create-brand.dto.js';
import { UpdateBrandDto } from '../../dtos/update-brand.dto.js';

@Controller('admin/brands')
@Roles(UserRole.ADMIN)
export class BrandAdminController {
  constructor(private readonly brandService: BrandService) {}

  @Get()
  async findAll() {
    return this.brandService.findAll();
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.brandService.findById(id);
  }

  @Post()
  async create(@Body() dto: CreateBrandDto) {
    return this.brandService.create(dto);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBrandDto,
  ) {
    await this.brandService.update(id, dto);
    return { message: 'Brand updated successfully' };
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.brandService.delete(id);
    return { message: 'Brand deleted successfully' };
  }
}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './entities/category.entity.js';
import { CategoryRepository } from './repositories/category.repository.js';
import { CategoryService } from './services/category.service.js';
import { CategoryAdminController } from './controllers/admin/category-admin.controller.js';
import { CategoryController } from './controllers/client/category.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Category])],
  controllers: [CategoryAdminController, CategoryController],
  providers: [CategoryRepository, CategoryService],
  exports: [CategoryService],
})
export class CategoryModule {}

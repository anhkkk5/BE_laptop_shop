import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity.js';
import { ProductImage } from './entities/product-image.entity.js';
import { ProductRepository } from './repositories/product.repository.js';
import { ProductImageRepository } from './repositories/product-image.repository.js';
import { ProductService } from './services/product.service.js';
import { ProductAdminController } from './controllers/admin/product-admin.controller.js';
import { ProductController } from './controllers/client/product.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductImage])],
  controllers: [ProductAdminController, ProductController],
  providers: [ProductRepository, ProductImageRepository, ProductService],
  exports: [ProductService],
})
export class ProductModule {}

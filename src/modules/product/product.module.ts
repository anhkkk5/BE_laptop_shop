import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity.js';
import { ProductImage } from './entities/product-image.entity.js';
import { ProductVariant } from './entities/product-variant.entity.js';
import { ProductRepository } from './repositories/product.repository.js';
import { ProductImageRepository } from './repositories/product-image.repository.js';
import { ProductVariantRepository } from './repositories/product-variant.repository.js';
import { ProductService } from './services/product.service.js';
import { ProductAdminController } from './controllers/admin/product-admin.controller.js';
import { ProductController } from './controllers/client/product.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductImage, ProductVariant])],
  controllers: [ProductAdminController, ProductController],
  providers: [
    ProductRepository,
    ProductImageRepository,
    ProductVariantRepository,
    ProductService,
  ],
  exports: [ProductService],
})
export class ProductModule {}

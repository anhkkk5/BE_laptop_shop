import {
  BadRequestException,
  Controller,
  ForbiddenException,
  InternalServerErrorException,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FilesInterceptor } from '@nestjs/platform-express';
import axios from 'axios';
import { createHash } from 'node:crypto';
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
  constructor(
    private readonly productService: ProductService,
    private readonly configService: ConfigService,
  ) {}

  private async uploadSingleImageToCloudinary(file: {
    buffer: Buffer;
    mimetype: string;
    originalname: string;
  }): Promise<string> {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      throw new InternalServerErrorException(
        'Thiếu cấu hình Cloudinary. Vui lòng kiểm tra CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET',
      );
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = 'smart-laptop/products';
    const fileName = file.originalname
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 60);
    const publicId = `${fileName || 'product-image'}-${Date.now()}`;

    const signatureBase = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = createHash('sha1').update(signatureBase).digest('hex');

    const fileBase64 = file.buffer.toString('base64');
    const fileDataUri = `data:${file.mimetype};base64,${fileBase64}`;

    const payload = new URLSearchParams({
      file: fileDataUri,
      api_key: apiKey,
      timestamp: String(timestamp),
      folder,
      public_id: publicId,
      signature,
    });

    const response = await axios.post(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      payload.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    const secureUrl = response.data?.secure_url;
    if (!secureUrl || typeof secureUrl !== 'string') {
      throw new InternalServerErrorException(
        'Cloudinary không trả về URL ảnh hợp lệ',
      );
    }

    return secureUrl;
  }

  @Post('upload-images')
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  @UseInterceptors(
    FilesInterceptor('files', 12, {
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
      fileFilter: (_req, file, callback) => {
        if (!file.mimetype.startsWith('image/')) {
          callback(
            new BadRequestException('Chỉ chấp nhận file ảnh cho sản phẩm'),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  async uploadImages(
    @UploadedFiles()
    files: Array<{ buffer: Buffer; mimetype: string; originalname: string }>,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Vui lòng chọn ít nhất 1 ảnh');
    }

    const imageUrls = await Promise.all(
      files.map((file) => this.uploadSingleImageToCloudinary(file)),
    );

    return { imageUrls };
  }

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

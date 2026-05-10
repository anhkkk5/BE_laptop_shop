import {
  Controller,
  Get,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Public } from '../../../common/decorators/public.decorator.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import { UserRole } from '../../user/enums/user-role.enum.js';
import { SiteSettingService } from '../services/site-setting.service.js';
import { CloudinaryService } from '../../../common/services/cloudinary.service.js';
import { UpdateLogoDto } from '../dtos/update-logo.dto.js';

@Controller('site-settings')
export class SiteSettingController {
  constructor(
    private readonly siteSettingService: SiteSettingService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get('public')
  @Public()
  async getPublicSettings() {
    return this.siteSettingService.getPublicSettings();
  }

  @Get()
  @Roles(UserRole.ADMIN)
  async getAllSettings() {
    return this.siteSettingService.getAllSettings();
  }

  @Post('logo')
  @Roles(UserRole.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async uploadLogo(
    @UploadedFile() file: Express.Multer.File,
    @Body('logoText') logoText?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file type
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only images are allowed.',
      );
    }

    // Upload to Cloudinary
    const result = await this.cloudinaryService.uploadImage(file, 'logo');

    // Save URL to settings
    await this.siteSettingService.setLogoUrl(result.secure_url);

    // Update logo text if provided
    if (logoText) {
      await this.siteSettingService.setLogoText(logoText);
    }

    return {
      message: 'Logo uploaded successfully',
      logoUrl: result.secure_url,
      logoText: logoText ?? (await this.siteSettingService.getLogoText()),
    };
  }

  @Post('logo-text')
  @Roles(UserRole.ADMIN)
  async updateLogoText(@Body() body: UpdateLogoDto) {
    if (body.logoText) {
      await this.siteSettingService.setLogoText(body.logoText);
    }
    return {
      message: 'Logo text updated successfully',
      logoText: body.logoText,
    };
  }
}

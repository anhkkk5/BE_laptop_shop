import { Injectable, NotFoundException } from '@nestjs/common';
import { BannerRepository } from '../repositories/banner.repository.js';
import { CreateBannerDto } from '../dtos/create-banner.dto.js';
import { UpdateBannerDto } from '../dtos/update-banner.dto.js';
import { Banner } from '../entities/banner.entity.js';

@Injectable()
export class BannerService {
  constructor(private readonly bannerRepository: BannerRepository) {}

  async findAll(): Promise<Banner[]> {
    return this.bannerRepository.findAll();
  }

  async findActive(): Promise<Banner[]> {
    return this.bannerRepository.findActive();
  }

  async findById(id: number): Promise<Banner> {
    const banner = await this.bannerRepository.findById(id);
    if (!banner) throw new NotFoundException('Banner not found');
    return banner;
  }

  async create(dto: CreateBannerDto): Promise<Banner> {
    return this.bannerRepository.create({
      title: dto.title,
      subtitle: dto.subtitle ?? null,
      imageUrl: dto.imageUrl ?? null,
      ctaText: dto.ctaText ?? null,
      ctaLink: dto.ctaLink ?? null,
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
    });
  }

  async update(id: number, dto: UpdateBannerDto): Promise<Banner> {
    await this.findById(id);
    const updated = await this.bannerRepository.update(id, {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.subtitle !== undefined && { subtitle: dto.subtitle }),
      ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
      ...(dto.ctaText !== undefined && { ctaText: dto.ctaText }),
      ...(dto.ctaLink !== undefined && { ctaLink: dto.ctaLink }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
    });
    return updated!;
  }

  async remove(id: number): Promise<void> {
    await this.findById(id);
    await this.bannerRepository.delete(id);
  }
}

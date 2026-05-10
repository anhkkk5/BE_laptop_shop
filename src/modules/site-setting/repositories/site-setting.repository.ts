import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SiteSetting } from '../entities/site-setting.entity.js';

@Injectable()
export class SiteSettingRepository {
  constructor(
    @InjectRepository(SiteSetting)
    private readonly repository: Repository<SiteSetting>,
  ) {}

  async findByKey(key: string): Promise<SiteSetting | null> {
    return this.repository.findOne({ where: { settingKey: key } });
  }

  async upsert(
    key: string,
    value: string,
    description?: string,
  ): Promise<SiteSetting> {
    let setting = await this.findByKey(key);
    if (setting) {
      setting.settingValue = value;
      if (description) setting.description = description;
      return this.repository.save(setting);
    }
    setting = this.repository.create({
      settingKey: key,
      settingValue: value,
      description: description ?? null,
    });
    return this.repository.save(setting);
  }

  async findAll(): Promise<SiteSetting[]> {
    return this.repository.find();
  }
}

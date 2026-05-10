import { Injectable } from '@nestjs/common';
import { SiteSettingRepository } from '../repositories/site-setting.repository.js';

// Setting keys
export const SETTING_KEYS = {
  LOGO_URL: 'logo_url',
  LOGO_TEXT: 'logo_text',
} as const;

@Injectable()
export class SiteSettingService {
  constructor(private readonly siteSettingRepository: SiteSettingRepository) {}

  async getLogoUrl(): Promise<string | null> {
    const setting = await this.siteSettingRepository.findByKey(
      SETTING_KEYS.LOGO_URL,
    );
    return setting?.settingValue ?? null;
  }

  async getLogoText(): Promise<string> {
    const setting = await this.siteSettingRepository.findByKey(
      SETTING_KEYS.LOGO_TEXT,
    );
    return setting?.settingValue ?? 'SMART LAPTOP';
  }

  async setLogoUrl(url: string): Promise<void> {
    await this.siteSettingRepository.upsert(
      SETTING_KEYS.LOGO_URL,
      url,
      'URL of the site logo image',
    );
  }

  async setLogoText(text: string): Promise<void> {
    await this.siteSettingRepository.upsert(
      SETTING_KEYS.LOGO_TEXT,
      text,
      'Text displayed next to the logo',
    );
  }

  async getPublicSettings(): Promise<{
    logoUrl: string | null;
    logoText: string;
  }> {
    return {
      logoUrl: await this.getLogoUrl(),
      logoText: await this.getLogoText(),
    };
  }

  async getAllSettings(): Promise<Record<string, string | null>> {
    const settings = await this.siteSettingRepository.findAll();
    const result: Record<string, string | null> = {};
    for (const setting of settings) {
      result[setting.settingKey] = setting.settingValue;
    }
    return result;
  }
}

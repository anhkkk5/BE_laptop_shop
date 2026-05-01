import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Public } from '../../../../common/decorators/public.decorator.js';
import { PcBuildService } from '../../services/pc-build.service.js';
import { CheckCompatibilityDto } from '../../dtos/check-compatibility.dto.js';
import { SuggestComponentsDto } from '../../dtos/suggest-components.dto.js';

@Controller('pc-build')
@Public()
export class PcBuildController {
  constructor(private readonly pcBuildService: PcBuildService) {}

  @Get('components/:type')
  async getComponentsByType(
    @Param('type') type: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = Number(limit);
    const safeLimit = Number.isInteger(parsedLimit) && parsedLimit > 0 ? parsedLimit : 20;
    return this.pcBuildService.getComponentsByType(type, safeLimit);
  }

  @Post('check')
  async checkCompatibility(@Body() dto: CheckCompatibilityDto) {
    return this.pcBuildService.checkCompatibility(dto);
  }

  @Post('suggest')
  async suggestComponents(@Body() dto: SuggestComponentsDto) {
    return this.pcBuildService.suggestComponents(dto);
  }
}

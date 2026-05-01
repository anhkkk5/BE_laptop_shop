import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { Roles } from '../../../../common/decorators/roles.decorator.js';
import { UserRole } from '../../../user/enums/user-role.enum.js';
import { PcBuildService } from '../../services/pc-build.service.js';
import { CreateCompatibilityRuleDto } from '../../dtos/create-compatibility-rule.dto.js';
import { UpdateCompatibilityRuleDto } from '../../dtos/update-compatibility-rule.dto.js';

@Controller('admin/pc-build')
@Roles(UserRole.ADMIN)
export class PcBuildAdminController {
  constructor(private readonly pcBuildService: PcBuildService) {}

  @Get('rules')
  async getRules() {
    return this.pcBuildService.getRules();
  }

  @Post('rules')
  async createRule(@Body() dto: CreateCompatibilityRuleDto) {
    return this.pcBuildService.createRule(dto);
  }

  @Patch('rules/:id')
  async updateRule(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCompatibilityRuleDto,
  ) {
    return this.pcBuildService.updateRule(id, dto);
  }

  @Delete('rules/:id')
  async deleteRule(@Param('id', ParseIntPipe) id: number) {
    return this.pcBuildService.deleteRule(id);
  }
}

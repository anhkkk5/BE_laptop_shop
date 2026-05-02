import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/index.js';
import { UserRole } from '../../../common/constants/index.js';
import { DashboardQueryDto } from '../dtos/dashboard-query.dto.js';
import { DashboardService } from '../services/dashboard.service.js';

@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  getOverview(@Query() query: DashboardQueryDto) {
    return this.dashboardService.getOverview(query);
  }
}

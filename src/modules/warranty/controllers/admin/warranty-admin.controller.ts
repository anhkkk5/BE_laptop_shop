import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator.js';
import { Roles } from '../../../../common/decorators/roles.decorator.js';
import { PaginationDto } from '../../../../common/dto/pagination.dto.js';
import { UserRole } from '../../../user/enums/user-role.enum.js';
import { WarrantyService } from '../../services/warranty.service.js';
import { AssignTicketDto } from '../../dtos/assign-ticket.dto.js';
import { UpdateTicketStatusDto } from '../../dtos/update-ticket-status.dto.js';

@Controller('admin/warranty')
@Roles(UserRole.ADMIN, UserRole.TECHNICIAN)
export class WarrantyAdminController {
  constructor(private readonly warrantyService: WarrantyService) {}

  @Get('summary')
  async getSummary() {
    return this.warrantyService.getSummary();
  }

  @Get('all')
  async findAll(@Query() pagination: PaginationDto) {
    return this.warrantyService.findAllTickets(
      pagination.page,
      pagination.limit,
    );
  }

  @Patch(':id/assign')
  @Roles(UserRole.ADMIN)
  async assign(
    @Param('id', ParseIntPipe) ticketId: number,
    @Body() dto: AssignTicketDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.warrantyService.assignTechnician(ticketId, dto, userId);
  }

  @Patch(':id/status')
  async updateStatus(
    @CurrentUser('id') userId: number,
    @CurrentUser('role') role: UserRole,
    @Param('id', ParseIntPipe) ticketId: number,
    @Body() dto: UpdateTicketStatusDto,
  ) {
    return this.warrantyService.updateStatus(ticketId, dto, userId, role);
  }
}

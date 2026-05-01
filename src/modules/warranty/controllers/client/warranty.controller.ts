import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator.js';
import { PaginationDto } from '../../../../common/dto/pagination.dto.js';
import { UserRole } from '../../../user/enums/user-role.enum.js';
import { WarrantyService } from '../../services/warranty.service.js';
import { CreateWarrantyTicketDto } from '../../dtos/create-warranty-ticket.dto.js';
import { UpdateTicketStatusDto } from '../../dtos/update-ticket-status.dto.js';
import { CreateRepairLogDto } from '../../dtos/create-repair-log.dto.js';

@Controller('warranty')
export class WarrantyController {
  constructor(private readonly warrantyService: WarrantyService) {}

  @Post()
  async createTicket(
    @CurrentUser('id') userId: number,
    @Body() dto: CreateWarrantyTicketDto,
  ) {
    return this.warrantyService.createTicket(userId, dto);
  }

  @Get()
  async findMyTickets(
    @CurrentUser('id') userId: number,
    @Query() pagination: PaginationDto,
  ) {
    return this.warrantyService.findMyTickets(
      userId,
      pagination.page,
      pagination.limit,
    );
  }

  @Get(':id')
  async findById(
    @CurrentUser('id') userId: number,
    @CurrentUser('role') role: UserRole,
    @Param('id', ParseIntPipe) ticketId: number,
  ) {
    return this.warrantyService.findTicketById(ticketId, userId, role);
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

  @Post(':id/logs')
  async addRepairLog(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) ticketId: number,
    @Body() dto: CreateRepairLogDto,
  ) {
    return this.warrantyService.addRepairLog(ticketId, dto, userId);
  }

  @Get(':id/logs')
  async getRepairLogs(
    @CurrentUser('id') userId: number,
    @CurrentUser('role') role: UserRole,
    @Param('id', ParseIntPipe) ticketId: number,
  ) {
    return this.warrantyService.getRepairLogs(ticketId, userId, role);
  }
}

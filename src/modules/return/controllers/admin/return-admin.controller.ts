import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { Roles } from '../../../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator.js';
import { UserRole } from '../../../user/enums/user-role.enum.js';
import { ReturnService } from '../../services/return.service.js';
import { ReviewReturnDto, InspectReturnDto, AddInternalNoteDto } from '../../dtos/return.dto.js';

@Controller('admin/returns')
@Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.WAREHOUSE)
export class ReturnAdminController {
  constructor(private readonly returnService: ReturnService) {}

  @Get()
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string, @Query('status') status?: string) {
    return this.returnService.findAll(Number(page) || 1, Number(limit) || 20, status);
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.returnService.findById(id);
  }

  @Patch(':id/review')
  async review(@CurrentUser('id') staffId: number, @Param('id', ParseIntPipe) id: number, @Body() dto: ReviewReturnDto) {
    const rr = await this.returnService.review(id, staffId, dto);
    if (dto.decision === 'approved') {
      await this.returnService.generateLabel(id);
    }
    return rr;
  }

  @Patch(':id/inspect')
  async inspect(@CurrentUser('id') staffId: number, @Param('id', ParseIntPipe) id: number, @Body() dto: InspectReturnDto) {
    return this.returnService.inspect(id, staffId, dto);
  }

  @Post(':id/process-refund')
  async processRefund(@Param('id', ParseIntPipe) id: number) {
    return this.returnService.processRefund(id);
  }

  @Patch(':id/notes')
  async addNote(@CurrentUser('id') staffId: number, @Param('id', ParseIntPipe) id: number, @Body() dto: AddInternalNoteDto) {
    return this.returnService.addInternalNote(id, staffId, dto);
  }

  @Get('analytics')
  async analytics(@Query('start') start: string, @Query('end') end: string) {
    return this.returnService.getAnalytics(start, end);
  }
}

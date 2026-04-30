import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from '../../services/user.service.js';
import { AdminUpdateUserDto } from '../../dtos/update-user.dto.js';
import { PaginationDto } from '../../../../common/dto/pagination.dto.js';
import { Roles } from '../../../../common/decorators/index.js';
import { UserRole } from '../../enums/user-role.enum.js';

@ApiTags('Admin - Users')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin/users')
export class UserAdminController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async findAll(@Query() pagination: PaginationDto) {
    return this.userService.findAll(pagination.page, pagination.limit);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const user = await this.userService.findById(id);
    const { password: _pwd, refreshToken: _rt, ...result } = user;
    return result;
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdminUpdateUserDto,
  ) {
    await this.userService.adminUpdate(id, dto);
    return { message: 'User updated' };
  }
}

import {
  Controller,
  Get,
  Patch,
  Body,
  Post,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from '../../services/user.service.js';
import { AddressService } from '../../services/address.service.js';
import { UpdateProfileDto } from '../../dtos/update-user.dto.js';
import {
  CreateAddressDto,
  UpdateAddressDto,
} from '../../dtos/create-address.dto.js';
import { CurrentUser } from '../../../../common/decorators/index.js';

@ApiTags('Client - Profile')
@ApiBearerAuth()
@Controller('user')
export class UserProfileController {
  constructor(
    private readonly userService: UserService,
    private readonly addressService: AddressService,
  ) {}

  @Get('profile')
  async getProfile(@CurrentUser('id') userId: number) {
    const user = await this.userService.findById(userId);
    const { password: _pwd, refreshToken: _rt, ...result } = user;
    return result;
  }

  @Patch('profile')
  async updateProfile(
    @CurrentUser('id') userId: number,
    @Body() dto: UpdateProfileDto,
  ) {
    await this.userService.updateProfile(userId, dto);
    return { message: 'Profile updated' };
  }

  @Get('addresses')
  async getAddresses(@CurrentUser('id') userId: number) {
    return this.addressService.findByUserId(userId);
  }

  @Post('addresses')
  async createAddress(
    @CurrentUser('id') userId: number,
    @Body() dto: CreateAddressDto,
  ) {
    return this.addressService.create(userId, dto);
  }

  @Patch('addresses/:id')
  async updateAddress(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) addressId: number,
    @Body() dto: UpdateAddressDto,
  ) {
    await this.addressService.update(userId, addressId, dto);
    return { message: 'Address updated' };
  }

  @Delete('addresses/:id')
  async deleteAddress(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) addressId: number,
  ) {
    await this.addressService.delete(userId, addressId);
    return { message: 'Address deleted' };
  }
}

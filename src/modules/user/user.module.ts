import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity.js';
import { Address } from './entities/address.entity.js';
import { UserRepository } from './repositories/user.repository.js';
import { AddressRepository } from './repositories/address.repository.js';
import { UserService } from './services/user.service.js';
import { AddressService } from './services/address.service.js';
import { UserProfileController } from './controllers/client/user-profile.controller.js';
import { UserAdminController } from './controllers/admin/user-admin.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([User, Address])],
  controllers: [UserProfileController, UserAdminController],
  providers: [UserRepository, AddressRepository, UserService, AddressService],
  exports: [UserService],
})
export class UserModule {}

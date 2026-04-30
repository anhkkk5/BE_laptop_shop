import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UserService } from '../../modules/user/services/user.service.js';
import { UserRole } from '../../modules/user/enums/user-role.enum.js';

@Injectable()
export class AdminSeed implements OnModuleInit {
  private readonly logger = new Logger(AdminSeed.name);

  constructor(
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.seedAdmin();
  }

  private async seedAdmin() {
    const email = this.configService.get<string>('ADMIN_EMAIL', 'admin@example.com');
    const password = this.configService.get<string>('ADMIN_PASSWORD', 'Admin@123');
    const name = this.configService.get<string>('ADMIN_NAME', 'Admin');

    const existing = await this.userService.findByEmail(email);
    if (existing) {
      this.logger.log(`Admin user already exists: ${email}`);
      return;
    }

    const saltRounds = this.configService.get<number>('BCRYPT_SALT_ROUNDS', 10);
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    await this.userService.create({
      email,
      password: hashedPassword,
      fullName: name,
      role: UserRole.ADMIN,
    });

    this.logger.log(`✅ Admin user created: ${email}`);
  }
}

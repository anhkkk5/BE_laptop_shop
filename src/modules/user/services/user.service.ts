import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository.js';
import { CreateUserDto } from '../dtos/create-user.dto.js';
import {
  UpdateProfileDto,
  AdminUpdateUserDto,
} from '../dtos/update-user.dto.js';
import { User } from '../entities/user.entity.js';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async findById(id: number): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.userRepository.findByGoogleId(googleId);
  }

  async create(dto: CreateUserDto): Promise<User> {
    const exists = await this.userRepository.existsByEmail(dto.email);
    if (exists) throw new ConflictException('Email already exists');
    return this.userRepository.create(dto);
  }

  async updateProfile(id: number, dto: UpdateProfileDto): Promise<void> {
    await this.findById(id);
    await this.userRepository.update(id, dto);
  }

  async adminUpdate(id: number, dto: AdminUpdateUserDto): Promise<void> {
    await this.findById(id);
    await this.userRepository.update(id, dto);
  }

  async findAll(page: number, limit: number) {
    return this.userRepository.findAll(page, limit);
  }

  async updateRefreshToken(
    id: number,
    refreshToken: string | null,
  ): Promise<void> {
    await this.userRepository.update(id, { refreshToken });
  }

  async updateLastLogin(id: number): Promise<void> {
    await this.userRepository.update(id, { lastLoginAt: new Date() });
  }

  async verifyEmail(id: number): Promise<void> {
    await this.userRepository.update(id, { isVerified: true });
  }

  async updatePassword(id: number, hashedPassword: string): Promise<void> {
    await this.userRepository.update(id, { password: hashedPassword });
  }
}

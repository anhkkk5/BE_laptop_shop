import { IsEnum, IsOptional, IsString } from 'class-validator';
import { UserRole } from '../enums/user-role.enum.js';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  fullName?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  avatar?: string;
}

export class AdminUpdateUserDto extends UpdateProfileDto {
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}

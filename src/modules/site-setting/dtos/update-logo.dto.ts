import { IsString, IsOptional } from 'class-validator';

export class UpdateLogoDto {
  @IsOptional()
  @IsString()
  logoText?: string;
}

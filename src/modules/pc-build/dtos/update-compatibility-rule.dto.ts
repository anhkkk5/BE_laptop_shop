import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateCompatibilityRuleDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  sourceType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  targetType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sourceSpecKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  targetSpecKey?: string;

  @IsOptional()
  @IsBoolean()
  strict?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  message?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;
}

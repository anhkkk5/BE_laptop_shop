import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCompatibilityRuleDto {
  @IsString()
  @MaxLength(50)
  sourceType!: string;

  @IsString()
  @MaxLength(50)
  targetType!: string;

  @IsString()
  @MaxLength(100)
  sourceSpecKey!: string;

  @IsString()
  @MaxLength(100)
  targetSpecKey!: string;

  @IsOptional()
  @IsBoolean()
  strict?: boolean = true;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  message?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number = 0;
}

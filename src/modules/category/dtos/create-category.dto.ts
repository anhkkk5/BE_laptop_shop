import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsString()
  @MaxLength(120)
  slug!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  image?: string;

  @IsOptional()
  @IsInt()
  parentId?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

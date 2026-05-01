import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  Max,
  Min,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';

export class QueryAdminReviewDto extends PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true') {
      return true;
    }
    if (value === false || value === 'false') {
      return false;
    }
    return value;
  })
  @IsBoolean()
  isVerified?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

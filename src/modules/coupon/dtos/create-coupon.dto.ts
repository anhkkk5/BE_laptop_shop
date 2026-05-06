import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { CouponDiscountType } from '../enums/coupon-discount-type.enum.js';

export class CreateCouponDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsEnum(CouponDiscountType)
  discountType!: CouponDiscountType;

  @IsNumber()
  @Min(1)
  discountValue!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxDiscountAmount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimitPerUser?: number;

  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsArray()
  applicableProductIds?: number[];

  @IsOptional()
  @IsArray()
  applicableCategoryIds?: number[];

  @IsOptional()
  @IsArray()
  applicableBrandIds?: number[];

  @IsOptional()
  @IsBoolean()
  firstTimeCustomerOnly?: boolean;

  @IsOptional()
  @IsBoolean()
  isStackable?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  buyQuantity?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  getQuantity?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

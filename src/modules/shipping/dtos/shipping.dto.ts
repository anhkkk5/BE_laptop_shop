import {
  IsString,
  IsOptional,
  IsIn,
  IsNumber,
  IsBoolean,
  Min,
  MaxLength,
} from 'class-validator';

export class CalculateShippingFeeDto {
  @IsString()
  @MaxLength(255)
  shippingAddress!: string;

  @IsOptional()
  @IsString()
  ward?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weightGrams?: number;

  @IsOptional()
  @IsString()
  @IsIn(['standard', 'express'])
  serviceType?: 'standard' | 'express';

  @IsOptional()
  @IsNumber()
  @Min(0)
  codAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  insuranceValue?: number;
}

export class ValidateAddressDto {
  @IsString()
  @MaxLength(255)
  address!: string;

  @IsOptional()
  @IsString()
  ward?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  province?: string;
}

export class CreateShippingOrderDto {
  @IsNumber()
  orderId!: number;

  @IsOptional()
  @IsString()
  @IsIn(['standard', 'express'])
  serviceType?: 'standard' | 'express';

  @IsOptional()
  @IsNumber()
  @Min(0)
  codAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  insuranceValue?: number;

  @IsOptional()
  @IsBoolean()
  splitPackages?: boolean;
}

export class BulkCreateShippingDto {
  @IsNumber({}, { each: true })
  orderIds!: number[];

  @IsOptional()
  @IsString()
  @IsIn(['standard', 'express'])
  serviceType?: 'standard' | 'express';
}

export class CancelShippingDto {
  @IsString()
  @MaxLength(255)
  reason!: string;
}

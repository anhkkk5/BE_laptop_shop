import { IsInt, IsString, IsOptional, IsEnum } from 'class-validator';

export enum AdjustTarget {
  AVAILABLE = 'available',
  DAMAGED = 'damaged',
  INCOMING = 'incoming',
}

export class AdjustStockDto {
  @IsInt()
  productId!: number;

  @IsInt()
  quantity!: number;

  @IsEnum(AdjustTarget)
  target!: AdjustTarget;

  @IsString()
  @IsOptional()
  reason?: string;
}

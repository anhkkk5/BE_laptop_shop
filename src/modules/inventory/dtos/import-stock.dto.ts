import { IsInt, IsPositive, IsString, IsOptional, Min } from 'class-validator';

export class ImportStockDto {
  @IsInt()
  @IsPositive()
  productId!: number;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsString()
  @IsOptional()
  reason?: string;
}

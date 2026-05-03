import { IsInt, IsPositive, IsString, IsOptional, Min } from 'class-validator';

export class ExportStockDto {
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

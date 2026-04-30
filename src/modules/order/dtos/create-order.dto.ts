import { IsString, IsOptional, MaxLength, IsIn } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  @MaxLength(100)
  customerName!: string;

  @IsString()
  @MaxLength(20)
  customerPhone!: string;

  @IsString()
  @MaxLength(255)
  shippingAddress!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsString()
  @IsIn(['cod'])
  paymentMethod?: 'cod';
}

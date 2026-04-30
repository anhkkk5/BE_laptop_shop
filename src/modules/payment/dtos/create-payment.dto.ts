import { IsEnum, IsInt, Min } from 'class-validator';
import { PaymentMethod } from '../entities/payment.entity.js';

export class CreatePaymentDto {
  @IsInt()
  @Min(1)
  orderId!: number;

  @IsEnum(PaymentMethod)
  method!: PaymentMethod;
}

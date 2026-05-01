import { IsEnum, IsInt, IsString, MaxLength, Min } from 'class-validator';
import { WarrantyPriority } from '../entities/warranty-ticket.entity.js';

export class CreateWarrantyTicketDto {
  @IsInt()
  @Min(1)
  orderId!: number;

  @IsInt()
  @Min(1)
  orderItemId!: number;

  @IsString()
  @MaxLength(2000)
  issueDescription!: string;

  @IsEnum(WarrantyPriority)
  priority!: WarrantyPriority;
}

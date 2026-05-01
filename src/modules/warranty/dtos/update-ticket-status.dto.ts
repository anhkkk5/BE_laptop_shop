import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { WarrantyTicketStatus } from '../entities/warranty-ticket.entity.js';

export class UpdateTicketStatusDto {
  @IsEnum(WarrantyTicketStatus)
  status!: WarrantyTicketStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  diagnosis?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  resolution?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedDays?: number;
}

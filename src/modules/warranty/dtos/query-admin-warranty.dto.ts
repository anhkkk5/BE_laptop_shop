import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';
import { WarrantyTicketStatus } from '../entities/warranty-ticket.entity.js';

export class QueryAdminWarrantyDto extends PaginationDto {
  @IsOptional()
  @IsEnum(WarrantyTicketStatus)
  status?: WarrantyTicketStatus;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

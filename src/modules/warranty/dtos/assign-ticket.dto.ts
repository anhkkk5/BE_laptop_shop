import { IsInt, Min } from 'class-validator';

export class AssignTicketDto {
  @IsInt()
  @Min(1)
  technicianId!: number;
}

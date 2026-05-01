import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRepairLogDto {
  @IsString()
  @MaxLength(50)
  status!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

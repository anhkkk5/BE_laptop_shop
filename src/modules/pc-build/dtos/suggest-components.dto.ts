import { IsArray, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class SuggestComponentsDto {
  @IsString()
  targetType!: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  selectedComponentIds?: number[];

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 8;
}

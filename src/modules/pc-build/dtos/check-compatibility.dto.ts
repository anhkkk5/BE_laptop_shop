import { ArrayMinSize, IsArray, IsInt, Min } from 'class-validator';

export class CheckCompatibilityDto {
  @IsArray()
  @ArrayMinSize(2)
  @IsInt({ each: true })
  @Min(1, { each: true })
  componentIds!: number[];
}

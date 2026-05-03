import { IsInt } from 'class-validator';

export class AddWishlistDto {
  @IsInt()
  productId!: number;
}

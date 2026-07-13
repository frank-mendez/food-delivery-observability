import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateRestaurantDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;
}

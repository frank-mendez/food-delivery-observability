import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class CreateOrderItemDto {
  @IsUUID()
  menuItemId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}

export class CreateOrderDto {
  @IsUUID()
  restaurantId!: string;

  @ValidateIf((request: CreateOrderDto) => !request.menuItemIds)
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items?: CreateOrderItemDto[];

  @ValidateIf((request: CreateOrderDto) => !request.items)
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('all', { each: true })
  menuItemIds?: string[];
}

import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
  Validate,
  ValidateNested,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import type { PaymentScenario } from '../../payments/payment.types';

export class CreateOrderItemDto {
  @IsUUID()
  menuItemId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}

@ValidatorConstraint({ name: 'HasExactlyOneOrderItemInput', async: false })
class HasExactlyOneOrderItemInputConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, validationArguments: ValidationArguments): boolean {
    const request = validationArguments.object as CreateOrderDto;
    const hasItems = Array.isArray(request.items) && request.items.length > 0;
    const hasMenuItemIds =
      Array.isArray(request.menuItemIds) && request.menuItemIds.length > 0;

    return hasItems !== hasMenuItemIds;
  }

  defaultMessage(): string {
    return 'Provide either items or menuItemIds, but not both';
  }
}

export class CreateOrderDto {
  @IsUUID()
  @Validate(HasExactlyOneOrderItemInputConstraint)
  restaurantId!: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items?: CreateOrderItemDto[];

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(20)
  @IsUUID('all', { each: true })
  menuItemIds?: string[];

  @IsOptional()
  @IsIn(['success', 'failure', 'timeout'])
  paymentScenario?: PaymentScenario;
}

import { IsOptional, IsUUID } from 'class-validator';

export class AssignDeliveryDto {
  @IsUUID()
  orderId!: string;

  @IsOptional()
  @IsUUID()
  riderProfileId?: string;
}

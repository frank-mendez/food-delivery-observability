import { RiderAvailability } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateRiderAvailabilityDto {
  @IsEnum(RiderAvailability)
  availability!: RiderAvailability;
}

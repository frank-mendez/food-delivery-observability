import { IsIn, IsOptional } from 'class-validator';
import type { PaymentScenario } from '../payment.types';

export class PaymentSimulationDto {
  @IsOptional()
  @IsIn(['success', 'failure', 'timeout'])
  scenario?: PaymentScenario;
}

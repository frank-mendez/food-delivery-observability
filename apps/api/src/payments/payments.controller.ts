import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PaymentSimulationDto } from './dto/payment-simulation.dto';
import { PaymentsService } from './payments.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Roles(UserRole.CUSTOMER, UserRole.ADMINISTRATOR)
  @Get(':orderId')
  findForOrder(
    @Param('orderId') orderId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paymentsService.findForOrder(orderId, user);
  }

  @Roles(UserRole.CUSTOMER, UserRole.ADMINISTRATOR)
  @Post(':orderId/retry')
  retryPayment(
    @Param('orderId') orderId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() paymentSimulationDto: PaymentSimulationDto,
  ) {
    return this.paymentsService.retryPayment(
      orderId,
      user,
      paymentSimulationDto.scenario ?? 'success',
    );
  }
}

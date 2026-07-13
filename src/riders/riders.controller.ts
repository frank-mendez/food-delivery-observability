import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RegisterDto } from '../auth/dto/register.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AssignDeliveryDto } from './dto/assign-delivery.dto';
import { UpdateRiderAvailabilityDto } from './dto/update-rider-availability.dto';
import { RidersService } from './riders.service';

@Controller('riders')
export class RidersController {
  constructor(private readonly ridersService: RidersService) {}

  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.ridersService.register(registerDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @Get('me')
  findProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.ridersService.findProfile(user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @Patch('me/availability')
  updateAvailability(
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateDto: UpdateRiderAvailabilityDto,
  ) {
    return this.ridersService.updateAvailability(user, updateDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RESTAURANT_OWNER, UserRole.ADMINISTRATOR)
  @Post('assignments')
  assignDelivery(
    @CurrentUser() user: AuthenticatedUser,
    @Body() assignDto: AssignDeliveryDto,
  ) {
    return this.ridersService.assignDelivery(user, assignDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @Get('deliveries')
  findDeliveryHistory(@CurrentUser() user: AuthenticatedUser) {
    return this.ridersService.findDeliveryHistory(user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @Patch('deliveries/:deliveryId/accept')
  acceptDelivery(
    @CurrentUser() user: AuthenticatedUser,
    @Param('deliveryId') deliveryId: string,
  ) {
    return this.ridersService.acceptDelivery(user, deliveryId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @Patch('deliveries/:deliveryId/pick-up')
  pickUpDelivery(
    @CurrentUser() user: AuthenticatedUser,
    @Param('deliveryId') deliveryId: string,
  ) {
    return this.ridersService.pickUpDelivery(user, deliveryId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @Patch('deliveries/:deliveryId/out-for-delivery')
  markOutForDelivery(
    @CurrentUser() user: AuthenticatedUser,
    @Param('deliveryId') deliveryId: string,
  ) {
    return this.ridersService.markOutForDelivery(user, deliveryId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @Patch('deliveries/:deliveryId/deliver')
  deliver(
    @CurrentUser() user: AuthenticatedUser,
    @Param('deliveryId') deliveryId: string,
  ) {
    return this.ridersService.deliver(user, deliveryId);
  }
}

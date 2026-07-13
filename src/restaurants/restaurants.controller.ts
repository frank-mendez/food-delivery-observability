import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateMenuItemDto, UpdateMenuItemDto } from './dto/menu-item.dto';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { UpdateRestaurantStatusDto } from './dto/update-restaurant-status.dto';
import { RestaurantsService } from './restaurants.service';

const OWNER_ROLES = [UserRole.RESTAURANT_OWNER, UserRole.ADMINISTRATOR];

@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Get()
  findAll() {
    return this.restaurantsService.findAll();
  }

  @Get('popular-items')
  findPopularItems(@Query('restaurantId') restaurantId?: string) {
    return this.restaurantsService.findPopularItems(restaurantId);
  }

  @Get(':restaurantId')
  findOne(@Param('restaurantId') restaurantId: string) {
    return this.restaurantsService.findOne(restaurantId);
  }

  @Get(':restaurantId/menu')
  findMenu(@Param('restaurantId') restaurantId: string) {
    return this.restaurantsService.findMenu(restaurantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...OWNER_ROLES)
  @Post()
  createRestaurant(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createDto: CreateRestaurantDto,
  ) {
    return this.restaurantsService.createRestaurant(user, createDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...OWNER_ROLES)
  @Patch(':restaurantId')
  updateRestaurant(
    @CurrentUser() user: AuthenticatedUser,
    @Param('restaurantId') restaurantId: string,
    @Body() updateDto: UpdateRestaurantDto,
  ) {
    return this.restaurantsService.updateRestaurant(
      user,
      restaurantId,
      updateDto,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...OWNER_ROLES)
  @Patch(':restaurantId/status')
  updateRestaurantStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('restaurantId') restaurantId: string,
    @Body() updateDto: UpdateRestaurantStatusDto,
  ) {
    return this.restaurantsService.updateRestaurantStatus(
      user,
      restaurantId,
      updateDto,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...OWNER_ROLES)
  @Post(':restaurantId/menu-items')
  createMenuItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('restaurantId') restaurantId: string,
    @Body() createDto: CreateMenuItemDto,
  ) {
    return this.restaurantsService.createMenuItem(
      user,
      restaurantId,
      createDto,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...OWNER_ROLES)
  @Patch(':restaurantId/menu-items/:menuItemId')
  updateMenuItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('restaurantId') restaurantId: string,
    @Param('menuItemId') menuItemId: string,
    @Body() updateDto: UpdateMenuItemDto,
  ) {
    return this.restaurantsService.updateMenuItem(
      user,
      restaurantId,
      menuItemId,
      updateDto,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...OWNER_ROLES)
  @Delete(':restaurantId/menu-items/:menuItemId')
  removeMenuItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('restaurantId') restaurantId: string,
    @Param('menuItemId') menuItemId: string,
  ) {
    return this.restaurantsService.removeMenuItem(
      user,
      restaurantId,
      menuItemId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...OWNER_ROLES)
  @Patch(':restaurantId/orders/:orderId/accept')
  acceptOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('restaurantId') restaurantId: string,
    @Param('orderId') orderId: string,
  ) {
    return this.restaurantsService.acceptOrder(user, restaurantId, orderId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...OWNER_ROLES)
  @Patch(':restaurantId/orders/:orderId/reject')
  rejectOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('restaurantId') restaurantId: string,
    @Param('orderId') orderId: string,
  ) {
    return this.restaurantsService.rejectOrder(user, restaurantId, orderId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...OWNER_ROLES)
  @Patch(':restaurantId/orders/:orderId/preparing')
  markPreparing(
    @CurrentUser() user: AuthenticatedUser,
    @Param('restaurantId') restaurantId: string,
    @Param('orderId') orderId: string,
  ) {
    return this.restaurantsService.markPreparing(user, restaurantId, orderId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...OWNER_ROLES)
  @Patch(':restaurantId/orders/:orderId/ready')
  markReady(
    @CurrentUser() user: AuthenticatedUser,
    @Param('restaurantId') restaurantId: string,
    @Param('orderId') orderId: string,
  ) {
    return this.restaurantsService.markReady(user, restaurantId, orderId);
  }
}

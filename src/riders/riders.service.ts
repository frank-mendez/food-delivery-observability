import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import {
  DeliveryStatus,
  OrderStatus,
  RiderAvailability,
  UserRole,
} from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { RegisterDto } from '../auth/dto/register.dto';
import { StructuredLoggerService } from '../common/logging/structured-logger.service';
import { TracingService } from '../common/tracing/tracing.service';
import { MetricsService } from '../metrics/metrics.service';
import { OrderLifecycleService } from '../orders/order-lifecycle.service';
import { PrismaService } from '../prisma/prisma.service';
import { QUEUE_NAMES } from '../queues/queue-names';
import { QueuesService } from '../queues/queues.service';
import { AssignDeliveryDto } from './dto/assign-delivery.dto';
import { UpdateRiderAvailabilityDto } from './dto/update-rider-availability.dto';
import { DeliveryAssignmentJobData } from './rider.types';

@Injectable()
export class RidersService implements OnModuleInit {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly authService: AuthService,
    private readonly queuesService: QueuesService,
    private readonly metricsService: MetricsService,
    private readonly logger: StructuredLoggerService,
    private readonly tracingService: TracingService,
    private readonly orderLifecycleService: OrderLifecycleService,
  ) {}

  onModuleInit() {
    this.queuesService.registerProcessor<DeliveryAssignmentJobData>(
      QUEUE_NAMES.delivery,
      async (job) => this.assignDeliveryFromQueue(job.data.orderId),
      2,
    );
  }

  register(registerDto: RegisterDto) {
    return this.authService.registerRider(registerDto);
  }

  async findProfile(user: AuthenticatedUser) {
    return this.prismaService.riderProfile.findUniqueOrThrow({
      where: { userId: user.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            role: true,
          },
        },
      },
    });
  }

  async updateAvailability(
    user: AuthenticatedUser,
    updateDto: UpdateRiderAvailabilityDto,
  ) {
    const riderProfile = await this.prismaService.riderProfile.update({
      where: { userId: user.id },
      data: { availability: updateDto.availability },
    });

    this.metricsService.recordRiderDeliveryEvent(
      'availability',
      updateDto.availability,
    );
    this.logger.info('Rider availability updated', {
      riderAvailability: updateDto.availability,
    });

    return riderProfile;
  }

  async assignDelivery(user: AuthenticatedUser, assignDto: AssignDeliveryDto) {
    await this.assertCanAssignOrder(user, assignDto.orderId);

    return this.assignReadyOrder(assignDto.orderId, assignDto.riderProfileId);
  }

  async findDeliveryHistory(user: AuthenticatedUser) {
    const riderProfile =
      await this.prismaService.riderProfile.findUniqueOrThrow({
        where: { userId: user.id },
      });

    return this.prismaService.delivery.findMany({
      where: { riderId: riderProfile.id },
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          include: {
            restaurant: true,
            items: { include: { menuItem: true } },
          },
        },
      },
    });
  }

  async acceptDelivery(user: AuthenticatedUser, deliveryId: string) {
    const { delivery } = await this.findOwnedDelivery(user, deliveryId);

    if (delivery.status !== DeliveryStatus.ASSIGNED) {
      throw new BadRequestException('Only assigned deliveries can be accepted');
    }

    return this.updateDeliveryStatus(
      deliveryId,
      DeliveryStatus.ACCEPTED,
      'accept',
      { acceptedAt: new Date() },
    );
  }

  async pickUpDelivery(user: AuthenticatedUser, deliveryId: string) {
    const { delivery } = await this.findOwnedDelivery(user, deliveryId);

    if (delivery.status !== DeliveryStatus.ACCEPTED) {
      throw new BadRequestException(
        'Only accepted deliveries can be picked up',
      );
    }

    await this.updateDeliveryStatus(
      deliveryId,
      DeliveryStatus.PICKED_UP,
      'pick_up',
      { pickedUpAt: new Date() },
    );

    return this.orderLifecycleService.transitionOrder({
      orderId: delivery.orderId,
      nextStatus: OrderStatus.PICKED_UP,
      actorRole: user.role,
      reason: 'rider_pick_up',
    });
  }

  async markOutForDelivery(user: AuthenticatedUser, deliveryId: string) {
    const { delivery } = await this.findOwnedDelivery(user, deliveryId);

    if (delivery.status !== DeliveryStatus.PICKED_UP) {
      throw new BadRequestException(
        'Only picked up deliveries can leave for delivery',
      );
    }

    await this.updateDeliveryStatus(
      deliveryId,
      DeliveryStatus.OUT_FOR_DELIVERY,
      'out_for_delivery',
    );

    return this.orderLifecycleService.transitionOrder({
      orderId: delivery.orderId,
      nextStatus: OrderStatus.OUT_FOR_DELIVERY,
      actorRole: user.role,
      reason: 'rider_out_for_delivery',
    });
  }

  async deliver(user: AuthenticatedUser, deliveryId: string) {
    const { delivery, riderProfile } = await this.findOwnedDelivery(
      user,
      deliveryId,
    );

    if (delivery.status !== DeliveryStatus.OUT_FOR_DELIVERY) {
      throw new BadRequestException(
        'Only out-for-delivery orders can be delivered',
      );
    }

    await this.updateDeliveryStatus(
      deliveryId,
      DeliveryStatus.DELIVERED,
      'deliver',
      { deliveredAt: new Date() },
    );
    await this.prismaService.riderProfile.update({
      where: { id: riderProfile.id },
      data: { availability: RiderAvailability.AVAILABLE },
    });

    return this.orderLifecycleService.transitionOrder({
      orderId: delivery.orderId,
      nextStatus: OrderStatus.DELIVERED,
      actorRole: user.role,
      reason: 'rider_delivered',
    });
  }

  private async assignDeliveryFromQueue(orderId: string) {
    return this.tracingService.startActiveSpan(
      'RidersService.assignDeliveryFromQueue',
      {
        'food_delivery.layer': 'worker',
      },
      async () => this.assignReadyOrder(orderId),
    );
  }

  private async assignReadyOrder(orderId: string, riderProfileId?: string) {
    const order = await this.prismaService.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.READY) {
      throw new BadRequestException('Only ready orders can be assigned');
    }

    const riderProfile = riderProfileId
      ? await this.prismaService.riderProfile.findUnique({
          where: { id: riderProfileId },
        })
      : await this.prismaService.riderProfile.findFirst({
          where: { availability: RiderAvailability.AVAILABLE },
          orderBy: { updatedAt: 'asc' },
        });

    if (!riderProfile) {
      throw new BadRequestException('No available rider found');
    }

    const delivery = await this.prismaService.delivery.upsert({
      where: { orderId },
      create: {
        orderId,
        riderId: riderProfile.id,
        status: DeliveryStatus.ASSIGNED,
      },
      update: {
        riderId: riderProfile.id,
        status: DeliveryStatus.ASSIGNED,
      },
    });

    await this.prismaService.riderProfile.update({
      where: { id: riderProfile.id },
      data: { availability: RiderAvailability.BUSY },
    });
    await this.orderLifecycleService.transitionOrder({
      orderId,
      nextStatus: OrderStatus.RIDER_ASSIGNED,
      actorRole: 'SYSTEM',
      reason: 'delivery_assigned',
      data: {
        riderId: riderProfile.id,
      },
    });
    this.metricsService.recordRiderDeliveryEvent(
      'assign',
      DeliveryStatus.ASSIGNED,
    );
    this.logger.info('Delivery assigned', {
      deliveryStatus: delivery.status,
    });

    return delivery;
  }

  private async updateDeliveryStatus(
    deliveryId: string,
    status: DeliveryStatus,
    action: string,
    data: { acceptedAt?: Date; pickedUpAt?: Date; deliveredAt?: Date } = {},
  ) {
    const delivery = await this.prismaService.delivery.update({
      where: { id: deliveryId },
      data: {
        ...data,
        status,
      },
    });

    this.metricsService.recordRiderDeliveryEvent(action, status);
    this.logger.info('Delivery status changed', {
      deliveryStatus: status,
      riderAction: action,
    });

    return delivery;
  }

  private async findOwnedDelivery(user: AuthenticatedUser, deliveryId: string) {
    const riderProfile = await this.prismaService.riderProfile.findUnique({
      where: { userId: user.id },
    });

    if (!riderProfile) {
      throw new NotFoundException('Rider profile not found');
    }

    const delivery = await this.prismaService.delivery.findUnique({
      where: { id: deliveryId },
    });

    if (!delivery || delivery.riderId !== riderProfile.id) {
      throw new NotFoundException('Delivery not found for this rider');
    }

    return { delivery, riderProfile };
  }

  private async assertCanAssignOrder(user: AuthenticatedUser, orderId: string) {
    if (user.role === UserRole.ADMINISTRATOR) {
      return;
    }

    const order = await this.prismaService.order.findUnique({
      where: { id: orderId },
      include: { restaurant: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (
      user.role === UserRole.RESTAURANT_OWNER &&
      order.restaurant.ownerId === user.id
    ) {
      return;
    }

    throw new ForbiddenException('Cannot assign delivery for this order');
  }
}

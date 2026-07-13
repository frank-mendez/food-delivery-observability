import { Injectable } from '@nestjs/common';
import { StructuredLoggerService } from '../common/logging/structured-logger.service';
import { TracingService } from '../common/tracing/tracing.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly logger: StructuredLoggerService,
    private readonly tracingService: TracingService,
  ) {}

  async findProfile(userId: string) {
    return this.tracingService.startActiveSpan(
      'CustomersService.findProfile',
      {
        'food_delivery.layer': 'service',
      },
      async () =>
        this.prismaService.user.findUniqueOrThrow({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            role: true,
            customerProfile: true,
          },
        }),
    );
  }

  async updateProfile(userId: string, updateDto: UpdateCustomerProfileDto) {
    const user = await this.prismaService.user.update({
      where: { id: userId },
      data: {
        name: updateDto.name,
        phone: updateDto.phone,
        customerProfile: {
          upsert: {
            create: {
              address: updateDto.address,
            },
            update: {
              address: updateDto.address,
            },
          },
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        customerProfile: true,
      },
    });

    this.logger.info('Customer profile updated', {
      userRole: user.role,
    });

    return user;
  }

  async findOrderHistory(userId: string) {
    return this.prismaService.order.findMany({
      where: { customerId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        restaurant: true,
        items: {
          include: {
            menuItem: true,
          },
        },
        payment: true,
        delivery: true,
      },
    });
  }
}

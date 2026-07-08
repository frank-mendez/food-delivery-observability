import { Injectable } from '@nestjs/common';
import { TracingService } from '../common/tracing/tracing.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RestaurantsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly tracingService: TracingService,
  ) {}

  findAll() {
    return this.tracingService.startActiveSpan(
      'RestaurantsService.findAll',
      {
        'food_delivery.layer': 'service',
      },
      async () =>
        this.tracingService.startActiveSpan(
          'Prisma.restaurant.findMany',
          {
            'food_delivery.layer': 'prisma',
            'db.system.name': 'postgresql',
            'db.operation.name': 'findMany',
          },
          async () =>
            this.prismaService.restaurant.findMany({
              orderBy: {
                name: 'asc',
              },
              include: {
                menuItems: {
                  orderBy: {
                    name: 'asc',
                  },
                },
              },
            }),
        ),
    );
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RestaurantsService {
  constructor(private readonly prismaService: PrismaService) {}

  findAll() {
    return this.prismaService.restaurant.findMany({
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
    });
  }
}

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CacheModule } from '../cache/cache.module';
import { DomainEventsModule } from '../domain-events/domain-events.module';
import { OrdersModule } from '../orders/orders.module';
import { QueuesModule } from '../queues/queues.module';
import { RestaurantsController } from './restaurants.controller';
import { RestaurantsService } from './restaurants.service';

@Module({
  imports: [
    AuthModule,
    CacheModule,
    DomainEventsModule,
    OrdersModule,
    QueuesModule,
  ],
  controllers: [RestaurantsController],
  providers: [RestaurantsService],
})
export class RestaurantsModule {}

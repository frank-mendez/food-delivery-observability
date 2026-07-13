import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DomainEventsModule } from '../domain-events/domain-events.module';
import { MetricsModule } from '../metrics/metrics.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { QueuesModule } from '../queues/queues.module';
import { OrderLifecycleService } from './order-lifecycle.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [
    AuthModule,
    MetricsModule,
    QueuesModule,
    DomainEventsModule,
    NotificationsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrderLifecycleService],
  exports: [OrderLifecycleService],
})
export class OrdersModule {}

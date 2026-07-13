import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DomainEventsModule } from '../domain-events/domain-events.module';
import { MetricsModule } from '../metrics/metrics.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrdersModule } from '../orders/orders.module';
import { QueuesModule } from '../queues/queues.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [
    AuthModule,
    MetricsModule,
    QueuesModule,
    DomainEventsModule,
    NotificationsModule,
    OrdersModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}

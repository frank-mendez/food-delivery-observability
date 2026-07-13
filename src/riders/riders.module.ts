import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MetricsModule } from '../metrics/metrics.module';
import { OrdersModule } from '../orders/orders.module';
import { QueuesModule } from '../queues/queues.module';
import { RidersController } from './riders.controller';
import { RidersService } from './riders.service';

@Module({
  imports: [AuthModule, MetricsModule, QueuesModule, OrdersModule],
  controllers: [RidersController],
  providers: [RidersService],
})
export class RidersModule {}

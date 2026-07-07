import { Module } from '@nestjs/common';
import { MetricsModule } from '../metrics/metrics.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [MetricsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}

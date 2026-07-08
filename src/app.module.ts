import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { HealthModule } from './health/health.module';
import { HttpMetricsInterceptor } from './common/interceptors/http-metrics.interceptor';
import { TracingInterceptor } from './common/interceptors/tracing.interceptor';
import { HttpLoggingMiddleware } from './common/middleware/http-logging.middleware';
import { RequestContextMiddleware } from './common/middleware/request-context.middleware';
import { ObservabilityModule } from './common/observability.module';
import { MetricsModule } from './metrics/metrics.module';
import { OrdersModule } from './orders/orders.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { RestaurantsModule } from './restaurants/restaurants.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ObservabilityModule,
    MetricsModule,
    PrismaModule,
    RedisModule,
    HealthModule,
    RestaurantsModule,
    OrdersModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpMetricsInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TracingInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestContextMiddleware, HttpLoggingMiddleware)
      .forRoutes('*');
  }
}

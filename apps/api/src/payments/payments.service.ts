import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, PaymentStatus, UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { StructuredLoggerService } from '../common/logging/structured-logger.service';
import { TracingService } from '../common/tracing/tracing.service';
import { DomainEventsService } from '../domain-events/domain-events.service';
import { MetricsService } from '../metrics/metrics.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OrderLifecycleService } from '../orders/order-lifecycle.service';
import { PrismaService } from '../prisma/prisma.service';
import { QUEUE_NAMES } from '../queues/queue-names';
import { QueuesService } from '../queues/queues.service';
import { PaymentJobData, PaymentScenario } from './payment.types';

@Injectable()
export class PaymentsService implements OnModuleInit {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
    private readonly queuesService: QueuesService,
    private readonly metricsService: MetricsService,
    private readonly logger: StructuredLoggerService,
    private readonly tracingService: TracingService,
    private readonly domainEventsService: DomainEventsService,
    private readonly notificationsService: NotificationsService,
    private readonly orderLifecycleService: OrderLifecycleService,
  ) {}

  onModuleInit() {
    this.queuesService.registerProcessor<PaymentJobData>(
      QUEUE_NAMES.payment,
      async (job) => this.processPayment(job.data),
      2,
    );
    this.queuesService.registerProcessor<PaymentJobData>(
      QUEUE_NAMES.retry,
      async (job) =>
        this.queuesService.add(QUEUE_NAMES.payment, 'payment.retry', {
          ...job.data,
          scenario: 'success',
          retryCount: (job.data.retryCount ?? 0) + 1,
        }),
      1,
    );
  }

  async findForOrder(orderId: string, user: AuthenticatedUser) {
    const payment = await this.prismaService.payment.findUnique({
      where: { orderId },
      include: {
        order: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    this.assertCanAccessOrder(payment.order.customerId, user);

    return payment;
  }

  async retryPayment(
    orderId: string,
    user: AuthenticatedUser,
    scenario: PaymentScenario = 'success',
  ) {
    const order = await this.prismaService.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    this.assertCanAccessOrder(order.customerId, user);

    if (order.status !== OrderStatus.PAYMENT_FAILED) {
      throw new BadRequestException('Only failed payments can be retried');
    }

    await this.orderLifecycleService.transitionOrder({
      orderId,
      nextStatus: OrderStatus.PAYMENT_PENDING,
      actorRole: user.role,
      reason: 'payment_retry',
    });
    await this.prismaService.payment.upsert({
      where: { orderId },
      create: {
        orderId,
        amount: order.totalAmount,
        status: PaymentStatus.PENDING,
      },
      update: {
        status: PaymentStatus.PENDING,
        failureReason: null,
      },
    });
    await this.enqueuePayment(orderId, scenario);

    return this.findForOrder(orderId, user);
  }

  async enqueuePayment(
    orderId: string,
    scenario: PaymentScenario = 'success',
    delay = 0,
  ) {
    return this.queuesService.add(
      QUEUE_NAMES.payment,
      'payment.process',
      {
        orderId,
        scenario,
      } satisfies PaymentJobData,
      {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 1_000,
        },
        delay,
      },
    );
  }

  private async processPayment(data: PaymentJobData) {
    return this.tracingService.startActiveSpan(
      'PaymentsService.processPayment',
      {
        'food_delivery.layer': 'worker',
        'food_delivery.payment.scenario': data.scenario,
      },
      async () => {
        const order = await this.prismaService.order.findUnique({
          where: { id: data.orderId },
          include: { payment: true },
        });

        if (!order) {
          throw new NotFoundException('Order not found');
        }

        if (order.status !== OrderStatus.PAYMENT_PENDING) {
          this.logger.warn('Payment job skipped for non-payable order', {
            orderStatus: order.status,
          });
          return order.payment;
        }

        await this.prismaService.payment.upsert({
          where: { orderId: order.id },
          create: {
            orderId: order.id,
            amount: order.totalAmount,
            status: PaymentStatus.PENDING,
            attemptCount: 1,
          },
          update: {
            attemptCount: {
              increment: 1,
            },
          },
        });

        const simulation = await this.simulatePayment(
          data.scenario,
          data.retryCount ?? 0,
        );

        this.metricsService.recordPaymentAttempt(
          simulation.outcome,
          simulation.durationSeconds,
        );

        if (simulation.outcome === 'timeout') {
          await this.handleTimeout(order.id);
          return this.prismaService.payment.findUnique({
            where: { orderId: order.id },
          });
        }

        if (simulation.outcome === 'failure') {
          await this.prismaService.payment.update({
            where: { orderId: order.id },
            data: {
              status: PaymentStatus.FAILED,
              failureReason: 'simulated_failure',
            },
          });
          await this.orderLifecycleService.transitionOrder({
            orderId: order.id,
            nextStatus: OrderStatus.PAYMENT_FAILED,
            actorRole: 'SYSTEM',
            reason: 'payment_failed',
          });
          await this.domainEventsService.recordEvent(
            'payment',
            order.id,
            'payment.failed',
            { outcome: simulation.outcome },
          );

          return this.prismaService.payment.findUnique({
            where: { orderId: order.id },
          });
        }

        await this.prismaService.payment.update({
          where: { orderId: order.id },
          data: {
            status: PaymentStatus.SUCCEEDED,
            providerReference: `sim_${Date.now()}`,
            failureReason: null,
          },
        });
        await this.orderLifecycleService.transitionOrder({
          orderId: order.id,
          nextStatus: OrderStatus.PAID,
          actorRole: 'SYSTEM',
          reason: 'payment_succeeded',
        });
        await this.domainEventsService.recordEvent(
          'payment',
          order.id,
          'payment.succeeded',
          { outcome: simulation.outcome },
        );

        return this.prismaService.payment.findUnique({
          where: { orderId: order.id },
        });
      },
    );
  }

  private async handleTimeout(orderId: string) {
    await this.prismaService.payment.update({
      where: { orderId },
      data: {
        status: PaymentStatus.RETRYING,
        failureReason: 'simulated_timeout',
      },
    });
    await this.domainEventsService.recordEvent(
      'payment',
      orderId,
      'payment.timeout',
      { retryQueued: true },
    );
    await this.notificationsService.enqueueUserNotification(
      (
        await this.prismaService.order.findUnique({
          where: { id: orderId },
          select: { customerId: true },
        })
      )?.customerId,
      orderId,
      'Your payment is taking longer than expected. We are retrying it now.',
    );
    await this.queuesService.add(
      QUEUE_NAMES.retry,
      'payment.retry',
      {
        orderId,
        scenario: 'success',
        retryCount: 1,
      } satisfies PaymentJobData,
      {
        delay: 1_000,
        attempts: 1,
      },
    );
  }

  private async simulatePayment(
    scenario: PaymentScenario,
    retryCount: number,
  ): Promise<{ outcome: PaymentScenario; durationSeconds: number }> {
    const minMs = Number(
      this.configService.get<string>('PAYMENT_SIM_MIN_LATENCY_MS') ?? 75,
    );
    const maxMs = Number(
      this.configService.get<string>('PAYMENT_SIM_MAX_LATENCY_MS') ?? 350,
    );
    const startedAt = process.hrtime.bigint();
    const latencyMs = minMs + Math.floor(Math.random() * (maxMs - minMs + 1));

    await this.sleep(scenario === 'timeout' ? latencyMs + 500 : latencyMs);

    const outcome =
      scenario === 'timeout' && retryCount > 0 ? 'success' : scenario;
    const durationSeconds =
      Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;

    return { outcome, durationSeconds };
  }

  private assertCanAccessOrder(
    customerId: string | null,
    user: AuthenticatedUser,
  ) {
    if (user.role === UserRole.ADMINISTRATOR) {
      return;
    }

    if (user.role === UserRole.CUSTOMER && customerId === user.id) {
      return;
    }

    throw new ForbiddenException('Cannot access payment for this order');
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

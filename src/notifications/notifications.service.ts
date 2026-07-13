import { Injectable, OnModuleInit } from '@nestjs/common';
import { NotificationChannel, NotificationStatus, User } from '@prisma/client';
import { StructuredLoggerService } from '../common/logging/structured-logger.service';
import { TracingService } from '../common/tracing/tracing.service';
import { MetricsService } from '../metrics/metrics.service';
import { PrismaService } from '../prisma/prisma.service';
import { QUEUE_NAMES } from '../queues/queue-names';
import { QueuesService } from '../queues/queues.service';
import { NotificationJobData } from './notification.types';

@Injectable()
export class NotificationsService implements OnModuleInit {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly queuesService: QueuesService,
    private readonly metricsService: MetricsService,
    private readonly logger: StructuredLoggerService,
    private readonly tracingService: TracingService,
  ) {}

  onModuleInit() {
    this.queuesService.registerProcessor<NotificationJobData>(
      QUEUE_NAMES.notification,
      async (job) => this.processNotification(job.data),
      4,
    );
  }

  async enqueueUserNotification(
    userId: string | null | undefined,
    orderId: string | null | undefined,
    message: string,
  ) {
    if (!userId) {
      return;
    }

    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return;
    }

    const jobs = this.buildNotificationJobs(user, orderId, message);

    await Promise.all(
      jobs.map((job) =>
        this.queuesService.add(QUEUE_NAMES.notification, 'send', job, {
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 500,
          },
        }),
      ),
    );
  }

  async findForUser(userId: string) {
    return this.prismaService.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  private async processNotification(data: NotificationJobData) {
    return this.tracingService.startActiveSpan(
      'NotificationsService.processNotification',
      {
        'food_delivery.layer': 'worker',
        'food_delivery.notification.channel': data.channel,
      },
      async () => {
        await this.sleep(40 + Math.floor(Math.random() * 120));

        const status = data.destination
          ? NotificationStatus.SENT
          : NotificationStatus.FAILED;
        const notification = await this.prismaService.notification.create({
          data: {
            userId: data.userId,
            orderId: data.orderId,
            channel: data.channel,
            destination: data.destination || 'unknown',
            message: data.message,
            status,
          },
        });

        this.metricsService.recordNotification(data.channel, status);
        this.logger.info('Notification processed', {
          notificationChannel: data.channel,
          notificationStatus: status,
        });

        return notification;
      },
    );
  }

  private buildNotificationJobs(
    user: User,
    orderId: string | null | undefined,
    message: string,
  ): NotificationJobData[] {
    const jobs: NotificationJobData[] = [
      {
        userId: user.id,
        orderId: orderId ?? undefined,
        channel: NotificationChannel.EMAIL,
        destination: user.email,
        message,
      },
      {
        userId: user.id,
        orderId: orderId ?? undefined,
        channel: NotificationChannel.PUSH,
        destination: `push:${user.id}`,
        message,
      },
    ];

    if (user.phone) {
      jobs.push({
        userId: user.id,
        orderId: orderId ?? undefined,
        channel: NotificationChannel.SMS,
        destination: user.phone,
        message,
      });
    }

    return jobs;
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConnectionOptions, Job, JobsOptions, Queue, Worker } from 'bullmq';
import { StructuredLoggerService } from '../common/logging/structured-logger.service';
import { TracingService } from '../common/tracing/tracing.service';
import { MetricsService } from '../metrics/metrics.service';
import { QUEUE_NAMES, QueueName } from './queue-names';

type QueueJobHandler<T> = (job: Job<T>) => Promise<unknown>;

@Injectable()
export class QueuesService implements OnModuleInit, OnModuleDestroy {
  private readonly queues = new Map<QueueName, Queue>();
  private readonly workers = new Map<QueueName, Worker>();
  private readonly queueNames = Object.values(QUEUE_NAMES);
  private queueMetricsInterval?: NodeJS.Timeout;

  constructor(
    private readonly configService: ConfigService,
    private readonly metricsService: MetricsService,
    private readonly logger: StructuredLoggerService,
    private readonly tracingService: TracingService,
  ) {}

  onModuleInit() {
    for (const queueName of this.queueNames) {
      this.getQueue(queueName);
    }

    this.queueMetricsInterval = setInterval(() => {
      void this.recordQueueDepths().catch((error) => {
        this.logger.warn('Queue depth collection failed', { error });
      });
    }, 5_000);
    this.queueMetricsInterval.unref();
  }

  async onModuleDestroy() {
    if (this.queueMetricsInterval) {
      clearInterval(this.queueMetricsInterval);
    }

    await Promise.all(
      Array.from(this.workers.values()).map((worker) => worker.close()),
    );
    await Promise.all(
      Array.from(this.queues.values()).map((queue) => queue.close()),
    );
  }

  async add<T>(
    queueName: QueueName,
    jobName: string,
    data: T,
    options: JobsOptions = {},
  ) {
    return this.getQueue(queueName).add(jobName, data, {
      removeOnComplete: 200,
      removeOnFail: 200,
      ...options,
    });
  }

  registerProcessor<T>(
    queueName: QueueName,
    handler: QueueJobHandler<T>,
    concurrency = 2,
  ) {
    if (this.workers.has(queueName)) {
      return;
    }

    const worker = new Worker<T>(
      queueName,
      async (job) =>
        this.tracingService.startActiveSpan(
          `Queue.${queueName}.process`,
          {
            'food_delivery.layer': 'queue',
            'messaging.system': 'bullmq',
            'messaging.destination.name': queueName,
            'messaging.operation.name': 'process',
          },
          async () => {
            const endTimer =
              this.metricsService.startQueueProcessingTimer(queueName);

            try {
              const result = await handler(job);
              endTimer('success');
              return result;
            } catch (error) {
              endTimer('failure');
              throw error;
            }
          },
        ),
      {
        connection: this.createConnection(),
        concurrency,
      },
    );

    worker.on('completed', (job) => {
      this.logger.info('Queue job completed', {
        queueName,
        jobName: job.name,
      });
    });

    worker.on('failed', (job, error) => {
      this.metricsService.incrementQueueFailure(queueName);

      if (job && (job.opts.attempts ?? 1) > job.attemptsMade) {
        this.metricsService.incrementQueueRetry(queueName);
      } else if (job && queueName !== QUEUE_NAMES.deadLetter) {
        void this.add(QUEUE_NAMES.deadLetter, 'dead-letter', {
          sourceQueue: queueName,
          jobName: job.name,
          data: job.data,
          errorMessage: error.message,
        });
      }

      this.logger.error('Queue job failed', {
        queueName,
        jobName: job?.name,
        error,
      });
    });

    this.workers.set(queueName, worker);
  }

  private getQueue(queueName: QueueName): Queue {
    const existingQueue = this.queues.get(queueName);

    if (existingQueue) {
      return existingQueue;
    }

    const queue = new Queue(queueName, {
      connection: this.createConnection(),
    });
    this.queues.set(queueName, queue);

    return queue;
  }

  private createConnection(): ConnectionOptions {
    return {
      host: this.configService.get<string>('REDIS_HOST') ?? 'localhost',
      port: Number(this.configService.get<string>('REDIS_PORT') ?? 6379),
      password: this.configService.get<string>('REDIS_PASSWORD') || undefined,
      maxRetriesPerRequest: null,
    };
  }

  private async recordQueueDepths() {
    await Promise.all(
      this.queueNames.map(async (queueName) => {
        const counts = await this.getQueue(queueName).getJobCounts(
          'waiting',
          'delayed',
          'active',
          'failed',
        );

        for (const [state, count] of Object.entries(counts)) {
          this.metricsService.setQueueDepth(queueName, state, count);
        }
      }),
    );
  }
}

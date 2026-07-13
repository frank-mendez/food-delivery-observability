import { NotificationChannel } from '@prisma/client';

export type NotificationJobData = {
  userId?: string;
  orderId?: string;
  channel: NotificationChannel;
  destination: string;
  message: string;
};

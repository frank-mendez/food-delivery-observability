export const QUEUE_NAMES = {
  payment: 'payment',
  notification: 'notification',
  delivery: 'delivery',
  retry: 'retry',
  deadLetter: 'dead-letter',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

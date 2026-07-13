export type PaymentScenario = 'success' | 'failure' | 'timeout';

export type PaymentJobData = {
  orderId: string;
  scenario: PaymentScenario;
  retryCount?: number;
};

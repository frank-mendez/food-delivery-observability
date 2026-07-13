import { z } from 'zod';

export const checkoutSchema = z.object({
  name: z.string().min(2, 'Enter a customer name').max(120),
  phone: z.string().min(7, 'Enter a reachable phone').max(40),
  address: z.string().min(8, 'Enter a delivery address').max(240),
  paymentScenario: z.enum(['success', 'failure', 'timeout']),
});

export type CheckoutValues = z.infer<typeof checkoutSchema>;

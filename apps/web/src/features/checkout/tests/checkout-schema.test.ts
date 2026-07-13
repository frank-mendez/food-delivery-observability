import { describe, expect, it } from 'vitest';
import { checkoutSchema } from '../schemas/checkout-schema';

describe('checkout schema', () => {
  it('accepts a valid checkout payload', () => {
    const result = checkoutSchema.safeParse({
      name: 'Demo Customer',
      phone: '+15550101010',
      address: '100 Local Test Ave',
      paymentScenario: 'success',
    });

    expect(result.success).toBe(true);
  });

  it('rejects incomplete delivery details', () => {
    const result = checkoutSchema.safeParse({
      name: 'D',
      phone: '1',
      address: 'short',
      paymentScenario: 'success',
    });

    expect(result.success).toBe(false);
  });
});

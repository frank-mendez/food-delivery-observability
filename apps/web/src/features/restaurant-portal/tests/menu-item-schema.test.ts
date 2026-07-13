import { describe, expect, it } from 'vitest';
import { menuItemSchema } from '../schemas/menu-item-schema';

describe('menu item schema', () => {
  it('validates menu item payloads', () => {
    expect(
      menuItemSchema.safeParse({
        name: 'Loaded Fries',
        price: 6.25,
        isAvailable: true,
      }).success,
    ).toBe(true);
  });
});

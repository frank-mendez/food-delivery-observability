import { describe, expect, it } from 'vitest';
import { profileSchema } from '../schemas/profile-schema';

describe('profile schema', () => {
  it('validates profile fields', () => {
    expect(
      profileSchema.safeParse({
        name: 'Demo Customer',
        phone: '+15550101010',
        address: '100 Local Test Ave',
      }).success,
    ).toBe(true);
  });
});

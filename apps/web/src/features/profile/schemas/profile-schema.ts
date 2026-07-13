import { z } from 'zod';

export const profileSchema = z.object({
  name: z.string().min(2, 'Enter a name').max(120),
  phone: z.string().min(7, 'Enter a phone number').max(40),
  address: z.string().min(8, 'Enter an address').max(240),
});

export type ProfileValues = z.infer<typeof profileSchema>;

import { z } from 'zod';

export const menuItemSchema = z.object({
  name: z.string().min(2, 'Enter an item name').max(120),
  price: z.number().min(0.01, 'Price must be greater than zero'),
  isAvailable: z.boolean(),
});

export type MenuItemValues = z.infer<typeof menuItemSchema>;

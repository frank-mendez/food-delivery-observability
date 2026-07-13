import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { MenuCard } from './menu-card';

const meta = {
  title: 'Restaurants/MenuCard',
  component: MenuCard,
  args: {
    item: {
      id: 'menu-1',
      restaurantId: 'restaurant-1',
      name: 'Classic Cheeseburger',
      price: '11.50',
      isAvailable: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  },
} satisfies Meta<typeof MenuCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

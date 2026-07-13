import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { RestaurantCard } from './restaurant-card';

const meta = {
  title: 'Restaurants/RestaurantCard',
  component: RestaurantCard,
  args: {
    restaurant: {
      id: 'restaurant-1',
      name: 'Northstar Burgers',
      status: 'OPEN',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      menuItems: [],
    },
  },
} satisfies Meta<typeof RestaurantCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

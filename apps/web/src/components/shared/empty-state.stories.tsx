import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ShoppingBag } from 'lucide-react';
import { EmptyState } from './empty-state';

const meta = {
  title: 'Shared/EmptyState',
  component: EmptyState,
  args: {
    title: 'Cart is empty',
    description: 'Add menu items from a restaurant to prepare checkout.',
    actionLabel: 'Browse restaurants',
    icon: ShoppingBag,
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

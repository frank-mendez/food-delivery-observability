import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Timeline } from './timeline';

const meta = {
  title: 'Shared/Timeline',
  component: Timeline,
  args: {
    items: [
      { label: 'Paid', complete: true },
      { label: 'Preparing', current: true },
      { label: 'Ready' },
      { label: 'Out For Delivery' },
    ],
  },
} satisfies Meta<typeof Timeline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OrderProgress: Story = {};

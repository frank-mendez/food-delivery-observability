import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Activity } from 'lucide-react';
import { MetricCard } from './metric-card';

const meta = {
  title: 'Shared/MetricCard',
  component: MetricCard,
  args: {
    label: 'Open restaurants',
    value: '3',
    detail: 'Seeded kitchens',
    icon: Activity,
    tone: 'blue',
  },
} satisfies Meta<typeof MetricCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StatusBadge } from './status-badge';

const meta = {
  title: 'Shared/StatusBadge',
  component: StatusBadge,
  args: {
    status: 'PREPARING',
  },
} satisfies Meta<typeof StatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Statuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {['OPEN', 'PAID', 'PREPARING', 'READY', 'DELIVERED', 'PAYMENT_FAILED'].map(
        (status) => (
          <StatusBadge key={status} status={status} />
        ),
      )}
    </div>
  ),
};

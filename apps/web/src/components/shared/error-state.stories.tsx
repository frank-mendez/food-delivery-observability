import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ErrorState } from './error-state';

const meta = {
  title: 'Shared/ErrorState',
  component: ErrorState,
  args: {
    error: new Error('Backend request failed'),
  },
} satisfies Meta<typeof ErrorState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

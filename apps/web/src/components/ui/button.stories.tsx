import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ShoppingCart } from 'lucide-react';
import { Button } from './button';

const meta = {
  title: 'UI/Button',
  component: Button,
  args: {
    children: 'Place order',
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Button>Default</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="accent">Accent</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="ghost">Ghost</Button>
      <Button size="icon" aria-label="Cart">
        <ShoppingCart className="h-4 w-4" />
      </Button>
    </div>
  ),
};

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Activity } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState } from './empty-state';
import { ErrorState } from './error-state';
import { MetricCard } from './metric-card';
import { CardGridSkeleton, Skeleton } from './skeleton';

describe('shared components', () => {
  it('renders an empty state action', async () => {
    const onAction = vi.fn();

    render(
      <EmptyState
        title="No orders yet"
        description="Create an order"
        actionLabel="Retry"
        onAction={onAction}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /retry/i }));

    expect(onAction).toHaveBeenCalled();
  });

  it('renders an error retry action', async () => {
    const onRetry = vi.fn();

    render(<ErrorState error={new Error('Failed')} onRetry={onRetry} />);
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));

    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(onRetry).toHaveBeenCalled();
  });

  it('renders metric and skeleton primitives', () => {
    const { container } = render(
      <>
        <MetricCard
          label="API status"
          value="ok"
          detail="Healthy"
          icon={Activity}
          tone="green"
        />
        <Skeleton data-testid="skeleton" />
        <CardGridSkeleton count={2} />
      </>,
    );

    expect(screen.getByText('API status')).toBeInTheDocument();
    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(3);
  });
});

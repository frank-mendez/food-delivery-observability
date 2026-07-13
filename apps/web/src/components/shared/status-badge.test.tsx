import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from './status-badge';

describe('StatusBadge', () => {
  it('formats backend enum status values', () => {
    render(<StatusBadge status="PAYMENT_FAILED" />);

    expect(screen.getByText('Payment Failed')).toBeInTheDocument();
  });
});

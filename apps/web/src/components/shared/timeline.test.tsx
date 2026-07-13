import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Timeline } from './timeline';

describe('Timeline', () => {
  it('renders every timeline item', () => {
    render(
      <Timeline
        items={[
          { label: 'Paid', complete: true },
          { label: 'Preparing', current: true },
        ]}
      />,
    );

    expect(screen.getByText('Paid')).toBeInTheDocument();
    expect(screen.getByText('Preparing')).toBeInTheDocument();
  });
});

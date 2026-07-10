import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { FinesTabs } from '../../frontend-user/src/features/driver/fines/FinesTabs';

describe('Driver FinesTabs', () => {
  it('renders fines and payment history navigation links', () => {
    render(
      <MemoryRouter initialEntries={['/driver/fines']}>
        <FinesTabs />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /manage fines/i })).toHaveAttribute('href', '/driver/fines');
    expect(screen.getByRole('link', { name: /payment history/i })).toHaveAttribute(
      'href',
      '/driver/fines/payments',
    );
  });
});

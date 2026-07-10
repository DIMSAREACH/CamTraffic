import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { RouteGuard } from '../../frontend-user/src/routes/RouteGuard';

describe('User RouteGuard', () => {
  it('renders children when access is allowed', () => {
    render(
      <MemoryRouter>
        <RouteGuard isAllowed>
          <p>Protected portal content</p>
        </RouteGuard>
      </MemoryRouter>,
    );

    expect(screen.getByText('Protected portal content')).toBeInTheDocument();
  });

  it('redirects to the configured route when access is denied', () => {
    render(
      <MemoryRouter initialEntries={['/driver/dashboard']}>
        <Routes>
          <Route
            path="/driver/dashboard"
            element={
              <RouteGuard isAllowed={false} redirectTo="/login">
                <p>Protected portal content</p>
              </RouteGuard>
            }
          />
          <Route path="/login" element={<p>User login</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('User login')).toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { RouteGuard } from '../../frontend-admin/src/routes/RouteGuard';

describe('Admin RouteGuard', () => {
  it('renders children when access is allowed', () => {
    render(
      <MemoryRouter>
        <RouteGuard isAllowed>
          <p>Protected admin content</p>
        </RouteGuard>
      </MemoryRouter>,
    );

    expect(screen.getByText('Protected admin content')).toBeInTheDocument();
  });

  it('redirects when access is denied', () => {
    render(
      <MemoryRouter initialEntries={['/secure']}>
        <Routes>
          <Route
            path="/secure"
            element={
              <RouteGuard isAllowed={false} redirectTo="/login">
                <p>Protected admin content</p>
              </RouteGuard>
            }
          />
          <Route path="/login" element={<p>Login page</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Login page')).toBeInTheDocument();
    expect(screen.queryByText('Protected admin content')).not.toBeInTheDocument();
  });
});

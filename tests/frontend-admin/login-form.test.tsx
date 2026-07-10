import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider, ThemeProvider } from '@camtraffic/ui';
import { LoginForm } from '../../frontend-admin/src/features/auth/LoginForm';

function renderLoginForm(overrides: Partial<Parameters<typeof LoginForm>[0]> = {}) {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const onForgotPassword = vi.fn();

  render(
    <ThemeProvider defaultMode="light">
      <I18nProvider defaultLocale="en">
        <LoginForm
          onSubmit={onSubmit}
          onForgotPassword={onForgotPassword}
          isLoading={false}
          errorMessage={null}
          {...overrides}
        />
      </I18nProvider>
    </ThemeProvider>,
  );

  return { onSubmit, onForgotPassword };
}

describe('Admin LoginForm', () => {
  it('renders login fields and submit button', () => {
    renderLoginForm();

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('submits trimmed credentials', async () => {
    const { onSubmit } = renderLoginForm();

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: '  admin@camtraffic.kh  ' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'admin1234' },
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('admin@camtraffic.kh', 'admin1234');
    });
  });

  it('shows API error message when provided', () => {
    renderLoginForm({ errorMessage: 'Invalid credentials' });

    expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
  });
});

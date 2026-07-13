import { AuthLanguageSwitcher } from '@shared/components/auth/AuthLanguageSwitcher';
import { AuthThemeToggle } from '@shared/components/AuthThemeToggle';

/** Fixed top-right controls on login/register pages. */
export function AuthPageControls() {
  return (
    <div className="auth-page-controls">
      <AuthLanguageSwitcher />
      <AuthThemeToggle />
    </div>
  );
}

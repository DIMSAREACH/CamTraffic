import { AuthLanguageSwitcher } from '@shared/components/auth/AuthLanguageSwitcher';
import { AuthThemeToggle } from '@shared/components/AuthThemeToggle';

/** Fixed top-right controls on login/register pages. */
export function AuthPageControls() {
  return (
    <div className="auth-page-controls">
      <div className="auth-page-controls__group">
        <AuthLanguageSwitcher />
        <AuthThemeToggle />
      </div>
    </div>
  );
}

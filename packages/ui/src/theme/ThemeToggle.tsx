import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@camtraffic/utils';
import { useTranslation } from '../locales/I18nProvider';
import { useTheme } from './ThemeProvider';

export interface ThemeToggleProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  showLabel?: boolean;
}

export function ThemeToggle({ className, showLabel = true, ...props }: ThemeToggleProps) {
  const { mode, toggleMode } = useTheme();
  const { t } = useTranslation();

  const label = mode === 'light' ? t.theme.switchToDark : t.theme.switchToLight;

  return (
    <button
      type="button"
      className={cn('ct-theme-toggle', className)}
      onClick={toggleMode}
      aria-label={label}
      title={label}
      {...props}
    >
      <span className="ct-theme-toggle__icon" aria-hidden="true">
        {mode === 'light' ? (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M12 18a6 6 0 1 1 0-12 6 6 0 0 1 0 12zm0-16h0a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1zm0 18a1 1 0 0 1-1-1v-2a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1zM4.22 4.22a1 1 0 0 1 1.41 0l1.42 1.42a1 1 0 1 1-1.41 1.41L4.22 5.64a1 1 0 0 1 0-1.42zm14.14 14.14a1 1 0 0 1 1.41 0l1.42 1.42a1 1 0 0 1-1.41 1.41l-1.42-1.42a1 1 0 0 1 0-1.41zM3 12a1 1 0 0 1 1-1h2a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1zm16 0a1 1 0 0 1 1-1h2a1 1 0 1 1 0 2h-2a1 1 0 0 1-1-1zM4.22 19.78a1 1 0 0 1 0-1.41l1.42-1.42a1 1 0 0 1 1.41 1.41l-1.42 1.42a1 1 0 0 1-1.41 0zm14.14-14.14a1 1 0 0 1 0-1.41l1.42-1.42a1 1 0 1 1 1.41 1.41l-1.42 1.42a1 1 0 0 1-1.41 0z" />
          </svg>
        )}
      </span>
      {showLabel ? <span className="ct-theme-toggle__label">{t.theme[mode]}</span> : null}
    </button>
  );
}

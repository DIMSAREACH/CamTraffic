import type { ReactNode } from 'react';
import { cn } from '@camtraffic/utils';

export interface ErrorStateProps {
  icon?: ReactNode;
  title: string;
  message?: string;
  error?: Error | string;
  action?: ReactNode;
  showDetails?: boolean;
  className?: string;
}

export function ErrorState({
  icon,
  title,
  message,
  error,
  action,
  showDetails = false,
  className,
}: ErrorStateProps) {
  const defaultIcon = (
    <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6M9 9l6 6" />
    </svg>
  );

  const errorMessage = typeof error === 'string' ? error : error?.message;

  return (
    <div className={cn('ct-error-state', className)}>
      <div className="ct-error-state__icon">{icon || defaultIcon}</div>
      <h3 className="ct-error-state__title">{title}</h3>
      {message ? <p className="ct-error-state__message">{message}</p> : null}
      {showDetails && errorMessage ? (
        <details className="ct-error-state__details">
          <summary>Technical details</summary>
          <pre className="ct-error-state__error">{errorMessage}</pre>
        </details>
      ) : null}
      {action ? <div className="ct-error-state__action">{action}</div> : null}
    </div>
  );
}

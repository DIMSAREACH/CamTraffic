import type { ReactNode } from 'react';
import { cn } from '@camtraffic/utils';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  const defaultIcon = (
    <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" opacity="0.3">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );

  return (
    <div className={cn('ct-empty-state', className)}>
      <div className="ct-empty-state__icon">{icon || defaultIcon}</div>
      <h3 className="ct-empty-state__title">{title}</h3>
      {description ? <p className="ct-empty-state__description">{description}</p> : null}
      {action ? <div className="ct-empty-state__action">{action}</div> : null}
    </div>
  );
}

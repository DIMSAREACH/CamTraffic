import type { HTMLAttributes } from 'react';
import { cn } from '@camtraffic/utils';

export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status: 'active' | 'inactive' | 'pending' | 'success' | 'warning' | 'danger' | 'info';
  label?: string;
  dot?: boolean;
}

export function StatusBadge({ status, label, dot = false, className, ...props }: StatusBadgeProps) {
  return (
    <span className={cn('ct-status-badge', `ct-status-badge--${status}`, className)} {...props}>
      {dot ? <span className="ct-status-badge__dot" /> : null}
      {label || status}
    </span>
  );
}

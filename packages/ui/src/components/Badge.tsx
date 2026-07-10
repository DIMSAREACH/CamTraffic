import type { ReactNode } from 'react';
import { cn } from '@camtraffic/utils';

export interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

const variantClass: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'ct-badge--default',
  success: 'ct-badge--success',
  warning: 'ct-badge--warning',
  danger: 'ct-badge--danger',
  info: 'ct-badge--info',
};

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return <span className={cn('ct-badge', variantClass[variant], className)}>{children}</span>;
}

import type { ReactNode } from 'react';
import { cn } from '@camtraffic/utils';

export interface AlertProps {
  children: ReactNode;
  title?: string;
  variant?: 'info' | 'success' | 'warning' | 'error';
  className?: string;
}

const variantClass: Record<NonNullable<AlertProps['variant']>, string> = {
  info: 'ct-alert--info',
  success: 'ct-alert--success',
  warning: 'ct-alert--warning',
  error: 'ct-alert--error',
};

export function Alert({ children, title, variant = 'info', className }: AlertProps) {
  return (
    <div className={cn('ct-alert', variantClass[variant], className)} role="alert">
      {title ? <p className="ct-alert__title">{title}</p> : null}
      <div className="ct-alert__body">{children}</div>
    </div>
  );
}

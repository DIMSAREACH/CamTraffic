import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@camtraffic/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const variantClass: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'ct-btn--primary',
  secondary: 'ct-btn--secondary',
  danger: 'ct-btn--danger',
  ghost: 'ct-btn--ghost',
};

const sizeClass: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'ct-btn--sm',
  md: 'ct-btn--md',
  lg: 'ct-btn--lg',
};

export function Button({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn('ct-btn', variantClass[variant], sizeClass[size], className)}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      aria-disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <span className="loading-spinner" style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} aria-hidden="true" />
          <span className="sr-only">Loading...</span>
          {children}
        </>
      ) : children}
    </button>
  );
}

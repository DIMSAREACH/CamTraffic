import { cn } from '@camtraffic/utils';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClass = {
  sm: 'ct-spinner--sm',
  md: 'ct-spinner--md',
  lg: 'ct-spinner--lg',
} as const;

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return <span className={cn('ct-spinner', sizeClass[size], className)} aria-label="Loading" role="status" />;
}

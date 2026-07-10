import { cn } from '@camtraffic/utils';

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circular' | 'rectangular';
  className?: string;
}

export function Skeleton({
  width,
  height,
  variant = 'rectangular',
  className,
}: SkeletonProps) {
  return (
    <div
      className={cn('ct-skeleton', `ct-skeleton--${variant}`, className)}
      style={{ width, height }}
      aria-busy="true"
      aria-live="polite"
    />
  );
}

export interface SkeletonGroupProps {
  count?: number;
  spacing?: string | number;
  children?: React.ReactNode;
  className?: string;
}

export function SkeletonGroup({
  count = 3,
  spacing = '0.75rem',
  children,
  className,
}: SkeletonGroupProps) {
  if (children) {
    return <div className={cn('ct-skeleton-group', className)} style={{ gap: spacing }}>{children}</div>;
  }

  return (
    <div className={cn('ct-skeleton-group', className)} style={{ gap: spacing }}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} />
      ))}
    </div>
  );
}

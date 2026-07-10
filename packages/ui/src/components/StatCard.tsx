import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@camtraffic/utils';

export interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: {
    value: number;
    label?: string;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
}

export function StatCard({
  label,
  value,
  icon,
  trend,
  variant = 'default',
  className,
  ...props
}: StatCardProps) {
  return (
    <div className={cn('ct-stat-card', `ct-stat-card--${variant}`, className)} {...props}>
      <div className="ct-stat-card__header">
        <span className="ct-stat-card__label">{label}</span>
        {icon ? <span className="ct-stat-card__icon">{icon}</span> : null}
      </div>
      <div className="ct-stat-card__body">
        <span className="ct-stat-card__value">{value}</span>
        {trend !== undefined ? (
          <span
            className={cn(
              'ct-stat-card__trend',
              trend.value > 0 && 'ct-stat-card__trend--up',
              trend.value < 0 && 'ct-stat-card__trend--down',
            )}
          >
            {trend.value > 0 ? '↑' : trend.value < 0 ? '↓' : '−'} {Math.abs(trend.value)}%
            {trend.label ? ` ${trend.label}` : ''}
          </span>
        ) : null}
      </div>
    </div>
  );
}

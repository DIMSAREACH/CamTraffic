import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@camtraffic/utils';

export interface ChartCardProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function ChartCard({ title, subtitle, children, actions, className, ...props }: ChartCardProps) {
  return (
    <div className={cn('ct-chart-card', className)} {...props}>
      <div className="ct-chart-card__header">
        <div>
          <h3 className="ct-chart-card__title">{title}</h3>
          {subtitle ? <p className="ct-chart-card__subtitle">{subtitle}</p> : null}
        </div>
        {actions ? <div className="ct-chart-card__actions">{actions}</div> : null}
      </div>
      <div className="ct-chart-card__body">{children}</div>
    </div>
  );
}

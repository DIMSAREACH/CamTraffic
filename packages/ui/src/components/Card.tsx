import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@camtraffic/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export function Card({ children, title, subtitle, className, ...props }: CardProps) {
  return (
    <section className={cn('ct-card', className)} {...props}>
      {title || subtitle ? (
        <header className="ct-card__header">
          {title ? <h3 className="ct-card__title">{title}</h3> : null}
          {subtitle ? <p className="ct-card__subtitle">{subtitle}</p> : null}
        </header>
      ) : null}
      <div className="ct-card__body">{children}</div>
    </section>
  );
}

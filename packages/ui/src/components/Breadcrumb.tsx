import type { ReactNode } from 'react';
import { cn } from '@camtraffic/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: ReactNode;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  separator?: ReactNode;
  className?: string;
}

export function Breadcrumb({ items, separator, className }: BreadcrumbProps) {
  const defaultSeparator = (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );

  return (
    <nav aria-label="Breadcrumb" className={cn('ct-breadcrumb', className)}>
      <ol className="ct-breadcrumb__list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="ct-breadcrumb__item">
              {item.href && !isLast ? (
                <a href={item.href} className="ct-breadcrumb__link">
                  {item.icon ? <span className="ct-breadcrumb__icon">{item.icon}</span> : null}
                  {item.label}
                </a>
              ) : (
                <span className={cn('ct-breadcrumb__text', isLast && 'ct-breadcrumb__text--current')}>
                  {item.icon ? <span className="ct-breadcrumb__icon">{item.icon}</span> : null}
                  {item.label}
                </span>
              )}
              {!isLast ? (
                <span className="ct-breadcrumb__separator" aria-hidden="true">
                  {separator || defaultSeparator}
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

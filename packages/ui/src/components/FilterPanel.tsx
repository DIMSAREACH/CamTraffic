import { useState, type ReactNode } from 'react';
import { cn } from '@camtraffic/utils';

export interface FilterPanelProps {
  title?: string;
  children: ReactNode;
  isCollapsible?: boolean;
  defaultCollapsed?: boolean;
  className?: string;
}

export function FilterPanel({
  title = 'Filters',
  children,
  isCollapsible = true,
  defaultCollapsed = false,
  className,
}: FilterPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <aside className={cn('ct-filter-panel', className)}>
      {title ? (
        <header className="ct-filter-panel__header">
          <h3 className="ct-filter-panel__title">{title}</h3>
          {isCollapsible ? (
            <button
              type="button"
              className="ct-filter-panel__toggle"
              onClick={() => setIsCollapsed(!isCollapsed)}
              aria-label={isCollapsed ? 'Expand filters' : 'Collapse filters'}
              aria-expanded={!isCollapsed}
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
          ) : null}
        </header>
      ) : null}
      {!isCollapsed ? <div className="ct-filter-panel__body">{children}</div> : null}
    </aside>
  );
}

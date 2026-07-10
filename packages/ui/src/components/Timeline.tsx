import type { ReactNode } from 'react';
import { cn } from '@camtraffic/utils';

export interface TimelineItem {
  id: string;
  timestamp: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
}

export interface TimelineProps {
  items: TimelineItem[];
  className?: string;
}

export function Timeline({ items, className }: TimelineProps) {
  return (
    <div className={cn('ct-timeline', className)}>
      {items.map((item, index) => (
        <div
          key={item.id}
          className={cn('ct-timeline__item', item.variant && `ct-timeline__item--${item.variant}`)}
        >
          <div className="ct-timeline__marker">
            {item.icon || <div className="ct-timeline__dot" />}
          </div>
          {index < items.length - 1 ? <div className="ct-timeline__line" /> : null}
          <div className="ct-timeline__content">
            <time className="ct-timeline__timestamp">{item.timestamp}</time>
            <h4 className="ct-timeline__title">{item.title}</h4>
            {item.description ? <p className="ct-timeline__description">{item.description}</p> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

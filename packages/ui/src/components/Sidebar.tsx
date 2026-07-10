import { useState, type ReactNode } from 'react';
import { cn } from '@camtraffic/utils';

export interface SidebarProps {
  children: ReactNode;
  isCollapsible?: boolean;
  defaultCollapsed?: boolean;
  className?: string;
  header?: ReactNode;
  footer?: ReactNode;
}

export function Sidebar({
  children,
  isCollapsible = true,
  defaultCollapsed = false,
  className,
  header,
  footer,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <aside className={cn('ct-sidebar', isCollapsed && 'ct-sidebar--collapsed', className)}>
      {header ? <div className="ct-sidebar__header">{header}</div> : null}
      <nav className="ct-sidebar__nav">{children}</nav>
      {footer ? <div className="ct-sidebar__footer">{footer}</div> : null}
      {isCollapsible ? (
        <button
          type="button"
          className="ct-sidebar__toggle"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!isCollapsed}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor">
            <path d={isCollapsed ? 'm9 18 6-6-6-6' : 'm15 18-6-6 6-6'} />
          </svg>
        </button>
      ) : null}
    </aside>
  );
}

export interface SidebarItemProps {
  icon?: ReactNode;
  label: string;
  href?: string;
  isActive?: boolean;
  onClick?: () => void;
  badge?: string | number;
  className?: string;
}

export function SidebarItem({
  icon,
  label,
  href,
  isActive,
  onClick,
  badge,
  className,
}: SidebarItemProps) {
  const Element = href ? 'a' : 'button';
  const props = href ? { href } : { type: 'button' as const, onClick };

  return (
    <Element
      className={cn('ct-sidebar__item', isActive && 'ct-sidebar__item--active', className)}
      {...props}
    >
      {icon ? <span className="ct-sidebar__item-icon">{icon}</span> : null}
      <span className="ct-sidebar__item-label">{label}</span>
      {badge !== undefined ? <span className="ct-sidebar__item-badge">{badge}</span> : null}
    </Element>
  );
}

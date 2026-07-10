import type { ReactNode } from 'react';
import { cn } from '@camtraffic/utils';

export interface HeaderProps {
  title?: string;
  logo?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function Header({ title, logo, actions, className }: HeaderProps) {
  return (
    <header className={cn('ct-header', className)}>
      <div className="ct-header__start">
        {logo ? <div className="ct-header__logo">{logo}</div> : null}
        {title ? <h1 className="ct-header__title">{title}</h1> : null}
      </div>
      {actions ? <div className="ct-header__actions">{actions}</div> : null}
    </header>
  );
}

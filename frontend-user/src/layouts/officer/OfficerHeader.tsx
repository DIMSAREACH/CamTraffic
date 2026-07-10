import type { ReactNode } from 'react';

interface OfficerHeaderProps {
  title: string;
  subtitle: string;
  badge: string;
  toolbar?: ReactNode;
}

export function OfficerHeader({ title, subtitle, badge, toolbar }: OfficerHeaderProps) {
  return (
    <header className="officer-layout__header">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="officer-layout__header-right">
        <span className="portal__badge">{badge}</span>
        {toolbar ? <div className="officer-layout__toolbar">{toolbar}</div> : null}
      </div>
    </header>
  );
}

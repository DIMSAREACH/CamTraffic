import type { ReactNode } from 'react';

interface DriverHeaderProps {
  title: string;
  subtitle: string;
  badge: string;
  toolbar?: ReactNode;
}

export function DriverHeader({ title, subtitle, badge, toolbar }: DriverHeaderProps) {
  return (
    <header className="driver-layout__header">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="driver-layout__header-right">
        <span className="portal__badge">{badge}</span>
        {toolbar ? <div className="driver-layout__toolbar">{toolbar}</div> : null}
      </div>
    </header>
  );
}

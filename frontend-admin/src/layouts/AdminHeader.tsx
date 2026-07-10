import type { ReactNode } from 'react';

interface AdminHeaderProps {
  title: string;
  subtitle: string;
  badge: string;
  toolbar?: ReactNode;
}

export function AdminHeader({ title, subtitle, badge, toolbar }: AdminHeaderProps) {
  return (
    <header className="admin-layout__header">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="admin-layout__header-right">
        <span className="portal__badge">{badge}</span>
        {toolbar ? <div className="admin-layout__toolbar">{toolbar}</div> : null}
      </div>
    </header>
  );
}

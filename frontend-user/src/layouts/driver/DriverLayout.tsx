import type { PropsWithChildren, ReactNode } from 'react';
import { DriverFooter } from './DriverFooter';
import { DriverHeader } from './DriverHeader';
import { DriverSidebarNavigation } from './DriverSidebarNavigation';

interface DriverLayoutProps extends PropsWithChildren {
  title: string;
  subtitle: string;
  badge: string;
  toolbar?: ReactNode;
  sidebar?: ReactNode;
  footer?: ReactNode;
}

export function DriverLayout({
  title,
  subtitle,
  badge,
  toolbar,
  sidebar,
  footer,
  children,
}: DriverLayoutProps) {
  return (
    <main className="driver-layout">
      <aside className="driver-layout__sidebar">
        <h2>{title}</h2>
        <p>{subtitle}</p>
        {sidebar ?? <DriverSidebarNavigation />}
      </aside>

      <section className="driver-layout__content">
        <DriverHeader title={title} subtitle={subtitle} badge={badge} toolbar={toolbar} />

        <div className="driver-layout__main">{children}</div>

        <footer className="driver-layout__footer">
          {footer ?? <DriverFooter text="CamTraffic Driver Portal" />}
        </footer>
      </section>
    </main>
  );
}

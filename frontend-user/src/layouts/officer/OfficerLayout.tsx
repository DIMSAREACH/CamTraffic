import type { PropsWithChildren, ReactNode } from 'react';
import { OfficerFooter } from './OfficerFooter';
import { OfficerHeader } from './OfficerHeader';
import { OfficerSidebarNavigation } from './OfficerSidebarNavigation';

interface OfficerLayoutProps extends PropsWithChildren {
  title: string;
  subtitle: string;
  badge: string;
  toolbar?: ReactNode;
  sidebar?: ReactNode;
  footer?: ReactNode;
}

export function OfficerLayout({
  title,
  subtitle,
  badge,
  toolbar,
  sidebar,
  footer,
  children,
}: OfficerLayoutProps) {
  return (
    <main className="officer-layout">
      <aside className="officer-layout__sidebar">
        <h2>{title}</h2>
        <p>{subtitle}</p>
        {sidebar ?? <OfficerSidebarNavigation />}
      </aside>

      <section className="officer-layout__content">
        <OfficerHeader title={title} subtitle={subtitle} badge={badge} toolbar={toolbar} />

        <div className="officer-layout__main">{children}</div>

        <footer className="officer-layout__footer">
          {footer ?? <OfficerFooter text="CamTraffic Officer Portal" />}
        </footer>
      </section>
    </main>
  );
}

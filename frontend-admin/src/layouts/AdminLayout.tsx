import type { PropsWithChildren, ReactNode } from 'react';
import { AdminFooter } from './AdminFooter';
import { AdminHeader } from './AdminHeader';
import { SidebarNavigation } from './SidebarNavigation';

interface AdminLayoutProps extends PropsWithChildren {
  title: string;
  subtitle: string;
  badge: string;
  toolbar?: ReactNode;
  sidebar?: ReactNode;
  footer?: ReactNode;
}

export function AdminLayout({
  title,
  subtitle,
  badge,
  toolbar,
  sidebar,
  footer,
  children,
}: AdminLayoutProps) {
  return (
    <main className="admin-layout">
      <aside className="admin-layout__sidebar">
        <h2>{title}</h2>
        <p>{subtitle}</p>
        {sidebar ?? <SidebarNavigation />}
      </aside>

      <section className="admin-layout__content">
        <AdminHeader title={title} subtitle={subtitle} badge={badge} toolbar={toolbar} />

        <div className="admin-layout__main">{children}</div>

        <footer className="admin-layout__footer">
          {footer ?? <AdminFooter text="CamTraffic Admin Portal" />}
        </footer>
      </section>
    </main>
  );
}

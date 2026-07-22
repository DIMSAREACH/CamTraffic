'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Car, FileText, Home, LogOut, Scale, ShieldAlert } from 'lucide-react';
import { citizenApi } from '@/lib/api';
import { clearSession, getStoredUser } from '@/lib/auth';
import type { User } from '@/lib/types';
import { t, useLocale } from '@/lib/i18n';

const NAV = [
  { href: '/dashboard', icon: Home, key: 'dashboard' as const },
  { href: '/fines', icon: FileText, key: 'fines' as const },
  { href: '/violations', icon: ShieldAlert, key: 'violations' as const },
  { href: '/appeals', icon: Scale, key: 'appeals' as const },
  { href: '/vehicles', icon: Car, key: 'vehicles' as const },
];

export function CitizenShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const copy = t[locale];
  const user = getStoredUser<User>();

  async function logout() {
    await citizenApi.logout().catch(() => clearSession());
    router.replace('/login');
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0 md:pl-64">
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-[var(--border)] bg-[var(--card)] p-4">
        <div className="mb-8">
          <p className="text-lg font-bold">{copy.appName}</p>
          <p className="text-sm text-[var(--muted)]">{user?.full_name}</p>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ href, icon: Icon, key }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium ${
                pathname.startsWith(href) ? 'bg-blue-50 text-blue-700' : 'text-[var(--foreground)]'
              }`}
            >
              <Icon size={18} />
              {copy[key]}
            </Link>
          ))}
        </nav>
        <button className="btn btn-outline mt-auto" onClick={logout}>
          <LogOut size={16} />
          {copy.logout}
        </button>
      </aside>

      <main className="mx-auto max-w-5xl p-4 md:p-8">{children}</main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 border-t border-[var(--border)] bg-[var(--card)] grid grid-cols-5">
        {NAV.map(({ href, icon: Icon, key }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center justify-center py-2 text-[10px] ${
              pathname.startsWith(href) ? 'text-blue-700' : 'text-[var(--muted)]'
            }`}
          >
            <Icon size={18} />
            <span>{copy[key]}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

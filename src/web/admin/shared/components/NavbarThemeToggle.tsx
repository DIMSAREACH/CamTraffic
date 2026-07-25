import { useEffect, useState } from 'react';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@shared/components/ui/dropdown-menu';
import { useLanguage } from '@shared/context/LanguageContext';
import { cn } from '@shared/components/ui/utils';

type ThemeChoice = 'light' | 'dark' | 'system';

const OPTIONS: { id: ThemeChoice; labelKey: 'theme.light' | 'theme.dark' | 'theme.system'; Icon: typeof Sun }[] = [
  { id: 'light', labelKey: 'theme.light', Icon: Sun },
  { id: 'dark', labelKey: 'theme.dark', Icon: Moon },
  { id: 'system', labelKey: 'theme.system', Icon: Monitor },
];

export function NavbarThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const active = (OPTIONS.find((o) => o.id === theme)?.id ?? 'system') as ThemeChoice;
  const TriggerIcon =
    active === 'system'
      ? resolvedTheme === 'dark'
        ? Moon
        : Sun
      : active === 'dark'
        ? Moon
        : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="app-navbar__icon-btn app-navbar__theme-btn cursor-pointer p-2.5 rounded-xl"
          aria-label={t('theme.label')}
          title={t('theme.label')}
          disabled={!mounted}
        >
          {mounted ? (
            <TriggerIcon size={18} className="app-navbar__theme-icon" />
          ) : (
            <span className="app-navbar__theme-icon-placeholder" aria-hidden />
          )}
        </button>
      </DropdownMenuTrigger>

      {mounted && (
        <DropdownMenuContent align="end" className="app-navbar__menu w-48 p-1">
          <div className="app-navbar__menu-stripe" aria-hidden />
          <DropdownMenuLabel className="app-navbar__menu-name px-3 py-2 text-xs font-bold uppercase tracking-wider opacity-70">
            {t('theme.label')}
          </DropdownMenuLabel>
          {OPTIONS.map((opt) => (
            <DropdownMenuItem
              key={opt.id}
              onClick={() => setTheme(opt.id)}
              className={cn(
                'app-navbar__menu-item app-navbar__theme-menu-item flex items-center gap-2.5 py-2.5 px-3 rounded-lg cursor-pointer bg-transparent',
              )}
            >
              <div className="app-navbar__theme-menu-icon w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0">
                <opt.Icon size={14} />
              </div>
              <span className="flex-1">{t(opt.labelKey)}</span>
              {active === opt.id && <Check size={16} className="app-navbar__theme-check" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  );
}

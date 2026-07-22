import { Check, Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@shared/components/ui/dropdown-menu';
import { LocaleFlag } from '@shared/components/LocaleFlag';
import { useLanguage } from '@shared/context/LanguageContext';
import { cn } from '@shared/components/ui/utils';
import type { Locale } from '@shared/i18n/translations';

const OPTIONS: { id: Locale; labelKey: 'navbar.english' | 'navbar.khmer'; short: string }[] = [
  { id: 'en', labelKey: 'navbar.english', short: 'EN' },
  { id: 'km', labelKey: 'navbar.khmer', short: 'ខ្មែរ' },
];

export function NavbarLanguageSwitcher() {
  const { locale, setLocale, t } = useLanguage();

  const current = OPTIONS.find((o) => o.id === locale) ?? OPTIONS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="app-navbar__icon-btn app-navbar__lang-btn relative cursor-pointer flex items-center gap-1.5 pl-2 pr-2.5 py-2 rounded-xl"
          aria-label={t('navbar.language')}
          title={t('navbar.language')}
        >
          <Globe size={15} className="app-navbar__lang-globe hidden sm:block" />
          <LocaleFlag locale={current.id} size="sm" />
          <span className="app-navbar__lang-code app-navbar__lang-short hidden md:inline tracking-wide">
            {current.short}
          </span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="app-navbar__menu w-52 p-1">
        <div className="app-navbar__menu-stripe" aria-hidden />
        <DropdownMenuLabel className="app-navbar__menu-name px-3 py-2 text-xs font-bold uppercase tracking-wider opacity-70">
          {t('navbar.language')}
        </DropdownMenuLabel>
        {OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.id}
            onClick={() => setLocale(opt.id)}
            className={cn(
              'app-navbar__menu-item app-navbar__lang-menu-item flex items-center gap-2.5 py-2.5 px-3 rounded-lg cursor-pointer bg-transparent',
            )}
          >
            <div
              className={cn(
                'app-navbar__lang-flag-box',
                opt.id === 'km' && 'app-navbar__lang-flag-box--kh',
              )}
              aria-hidden
            >
              <LocaleFlag locale={opt.id} size="fill" />
            </div>
            <span className="flex-1">{t(opt.labelKey)}</span>
            <span className="app-navbar__lang-short">{opt.short}</span>
            {locale === opt.id && <Check size={16} className="app-navbar__lang-check" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

import { Check, Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

/** Compact EN/KM switcher for unauthenticated auth pages. */
export function AuthLanguageSwitcher() {
  const { locale, setLocale, t } = useLanguage();
  const current = OPTIONS.find((o) => o.id === locale) ?? OPTIONS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="auth-lang-toggle"
          aria-label={t('navbar.language')}
          title={`${t('navbar.language')}: ${t(current.labelKey)}`}
        >
          <Globe size={17} strokeWidth={1.75} className="auth-lang-toggle__globe" aria-hidden />
          <LocaleFlag locale={current.id} size="sm" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 p-1">
        {OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.id}
            onClick={() => setLocale(opt.id)}
            className={cn('flex items-center gap-2 cursor-pointer')}
          >
            <LocaleFlag locale={opt.id} size="sm" />
            <span className="flex-1">{t(opt.labelKey)}</span>
            {locale === opt.id && <Check size={14} />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

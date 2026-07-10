import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@camtraffic/utils';
import { SUPPORTED_LOCALES } from './config';
import { useTranslation } from './I18nProvider';
import type { Locale } from './types';

export interface LocaleToggleProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  showLabel?: boolean;
}

function nextLocale(current: Locale): Locale {
  const index = SUPPORTED_LOCALES.findIndex((item) => item.code === current);
  const nextIndex = (index + 1) % SUPPORTED_LOCALES.length;
  return SUPPORTED_LOCALES[nextIndex]?.code ?? 'en';
}

export function LocaleToggle({ className, showLabel = true, ...props }: LocaleToggleProps) {
  const { locale, setLocale, t } = useTranslation();
  const target = nextLocale(locale);

  return (
    <button
      type="button"
      className={cn('ct-locale-toggle', className)}
      onClick={() => setLocale(target)}
      aria-label={`${t.locale.switchTo}: ${t.locale[target]}`}
      title={`${t.locale.switchTo}: ${t.locale[target]}`}
      {...props}
    >
      <span className="ct-locale-toggle__code" aria-hidden="true">
        {locale.toUpperCase()}
      </span>
      {showLabel ? (
        <span className="ct-locale-toggle__label">{t.locale[target]}</span>
      ) : null}
    </button>
  );
}

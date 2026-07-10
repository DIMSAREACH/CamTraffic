import { cn } from '@camtraffic/utils';

export interface Language {
  code: string;
  label: string;
  nativeLabel?: string;
}

export interface LanguageSwitcherProps {
  currentLanguage: string;
  languages: Language[];
  onChange: (languageCode: string) => void;
  className?: string;
}

export function LanguageSwitcher({
  currentLanguage,
  languages,
  onChange,
  className,
}: LanguageSwitcherProps) {
  return (
    <div className={cn('ct-language-switcher', className)}>
      <label htmlFor="language-select" className="ct-language-switcher__label">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20" />
        </svg>
      </label>
      <select
        id="language-select"
        className="ct-language-switcher__select"
        value={currentLanguage}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Select language"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.nativeLabel || lang.label}
          </option>
        ))}
      </select>
    </div>
  );
}

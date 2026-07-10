import { useCallback, type InputHTMLAttributes } from 'react';
import { cn } from '@camtraffic/utils';

export interface SearchBarProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onSearch?: (value: string) => void;
  onClear?: () => void;
  showClear?: boolean;
}

export function SearchBar({
  onSearch,
  onClear,
  showClear = true,
  className,
  value,
  onChange,
  ...props
}: SearchBarProps) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && onSearch) {
        onSearch(e.currentTarget.value);
      }
    },
    [onSearch],
  );

  const handleClear = useCallback(() => {
    if (onClear) {
      onClear();
    }
  }, [onClear]);

  return (
    <div className={cn('ct-search-bar', className)}>
      <span className="ct-search-bar__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </span>
      <input
        type="search"
        className="ct-search-bar__input"
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        {...props}
      />
      {showClear && value ? (
        <button
          type="button"
          className="ct-search-bar__clear"
          onClick={handleClear}
          aria-label="Clear search"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}

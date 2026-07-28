import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router';
import { CornerDownLeft, Search, X } from 'lucide-react';
import { useLanguage } from '@shared/context/LanguageContext';
import { cn } from '@shared/components/ui/utils';
import {
  filterNavSearchItems,
  type NavSearchItem,
} from '@shared/utils/navSearch';

interface NavbarGlobalSearchProps {
  items: NavSearchItem[];
}

export function NavbarGlobalSearch({ items }: NavbarGlobalSearchProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const results = useMemo(
    () => filterNavSearchItems(items, query, (key) => t(key)),
    [items, query, t],
  );

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      setActiveIndex(0);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
        setQuery('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [open]);

  const goTo = (item: NavSearchItem) => {
    navigate(item.path);
    setOpen(false);
    setQuery('');
  };

  const onInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(0, results.length - 1)));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const target = results[activeIndex];
      if (target) goTo(target);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="app-navbar__search flex items-center gap-2.5 rounded-xl px-3 py-2 w-[190px]"
      >
        <Search size={15} className="app-navbar__search-icon" />
        <span className="app-navbar__search-hint flex-1 text-left">{t('navbar.search')}</span>
        <kbd className="app-navbar__kbd hidden lg:flex items-center px-1.5 py-0.5 rounded">⌘K</kbd>
      </button>
    );
  }

  return (
    <div ref={rootRef} className="app-navbar__search-wrap relative">
      <div className="app-navbar__search app-navbar__search--open flex items-center gap-2 rounded-xl px-3 py-2 w-[min(100vw-2rem,22rem)]">
        <Search size={15} className="app-navbar__search-icon" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onInputKeyDown}
          placeholder={t('navbar.searchPlaceholder')}
          className="bg-transparent app-navbar__search-input outline-none flex-1"
          aria-autocomplete="list"
          aria-controls="navbar-search-results"
          aria-expanded
          role="combobox"
        />
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setQuery('');
          }}
          className="app-navbar__search-close"
          aria-label={t('common.close')}
        >
          <X size={15} />
        </button>
      </div>

      <div
        id="navbar-search-results"
        className="app-navbar__search-results"
        role="listbox"
      >
        <p className="app-navbar__search-results-label">
          {query.trim() ? t('navbar.searchResults') : t('navbar.searchSuggestions')}
        </p>
        {results.length === 0 ? (
          <div className="app-navbar__search-empty">{t('navbar.noSearchResults')}</div>
        ) : (
          <ul className="app-navbar__search-list">
            {results.map((item, index) => (
              <li key={item.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  className={cn(
                    'app-navbar__search-item',
                    index === activeIndex && 'is-active',
                  )}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => goTo(item)}
                >
                  <span className="app-navbar__search-item-copy">
                    <span className="app-navbar__search-item-title">{t(item.labelKey)}</span>
                    <span className="app-navbar__search-item-path">{item.path}</span>
                  </span>
                  <CornerDownLeft size={13} className="app-navbar__search-item-enter" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

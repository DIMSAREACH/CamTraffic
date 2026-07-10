import { resolveThemeMode } from './applyTheme';

/** Inline in index.html to prevent theme flash before React hydrates. */
export function createThemeBootstrapScript(storageKey: string, defaultPreference = 'system'): string {
  return `(function(){try{var k=${JSON.stringify(storageKey)};var d=${JSON.stringify(defaultPreference)};var s=localStorage.getItem(k);var p=s==="light"||s==="dark"||s==="system"?s:d;var m=p==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):p;document.documentElement.setAttribute("data-theme",m);document.documentElement.style.colorScheme=m;}catch(e){}})();`;
}

export function readStoredPreference(
  storageKey: string,
  fallback: 'light' | 'dark' | 'system' = 'system',
): 'light' | 'dark' | 'system' {
  if (typeof window === 'undefined') return fallback;
  const stored = window.localStorage.getItem(storageKey);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return fallback;
}

export function bootstrapTheme(
  storageKey: string,
  fallback: 'light' | 'dark' | 'system' = 'system',
): 'light' | 'dark' {
  const preference = readStoredPreference(storageKey, fallback);
  const mode = resolveThemeMode(preference);
  document.documentElement.setAttribute('data-theme', mode);
  document.documentElement.style.colorScheme = mode;
  return mode;
}

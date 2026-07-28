import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  DEFAULT_APPEARANCE,
  loadAppearance,
  saveAppearance,
  isLightColor,
  type AppearanceColors,
  type AppearancePalette,
  type AppearanceZone,
} from '@shared/config/appearanceColors';

type AppearanceContextValue = {
  colors: AppearanceColors;
  setZoneColor: (zone: AppearanceZone, hex: string | null) => void;
  applyPalette: (palette: AppearancePalette, setTheme?: (t: string) => void) => void;
  syncNavbarToLogo: () => void;
  resetZone: (zone: AppearanceZone) => void;
  resetAll: () => void;
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

function applyAppearanceToDocument(colors: AppearanceColors) {
  const root = document.documentElement;

  if (colors.logoHeader) {
    root.style.setProperty('--ct-logo-header-bg', colors.logoHeader);
    root.dataset.ctLogoHeader = 'custom';
    root.classList.toggle('ct-logo-header-light', isLightColor(colors.logoHeader));
  } else {
    root.style.removeProperty('--ct-logo-header-bg');
    delete root.dataset.ctLogoHeader;
    root.classList.remove('ct-logo-header-light');
  }

  if (colors.navbar) {
    root.style.setProperty('--ct-navbar-bg', colors.navbar);
    root.dataset.ctNavbar = 'custom';
    root.classList.toggle('ct-navbar-light', isLightColor(colors.navbar));
  } else {
    root.style.removeProperty('--ct-navbar-bg');
    delete root.dataset.ctNavbar;
    root.classList.remove('ct-navbar-light');
  }

  if (colors.sidebar) {
    root.style.setProperty('--ct-sidebar-bg', colors.sidebar);
    root.dataset.ctSidebar = 'custom';
    root.classList.toggle('ct-sidebar-light', isLightColor(colors.sidebar));
  } else {
    root.style.removeProperty('--ct-sidebar-bg');
    delete root.dataset.ctSidebar;
    root.classList.remove('ct-sidebar-light');
  }

  if (colors.pageShell) {
    root.style.setProperty('--ct-page-shell-bg', colors.pageShell);
    root.dataset.ctPageShell = 'custom';
  } else {
    root.style.removeProperty('--ct-page-shell-bg');
    delete root.dataset.ctPageShell;
  }

  if (colors.accent) {
    root.style.setProperty('--ct-accent', colors.accent);
    root.dataset.ctAccent = 'custom';
  } else {
    root.style.removeProperty('--ct-accent');
    delete root.dataset.ctAccent;
  }
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [colors, setColors] = useState<AppearanceColors>(() => loadAppearance());

  useEffect(() => {
    applyAppearanceToDocument(colors);
  }, [colors]);

  const setZoneColor = useCallback((zone: AppearanceZone, hex: string | null) => {
    setColors((prev) => {
      const next = { ...prev, [zone]: hex };
      saveAppearance(next);
      return next;
    });
  }, []);

  const applyPalette = useCallback((palette: AppearancePalette, setTheme?: (t: string) => void) => {
    setColors(() => {
      const next = { ...palette.colors };
      saveAppearance(next);
      return next;
    });
    if (palette.theme && setTheme) setTheme(palette.theme);
  }, []);

  const syncNavbarToLogo = useCallback(() => {
    setColors((prev) => {
      if (!prev.logoHeader) return prev;
      const next = { ...prev, navbar: prev.logoHeader };
      saveAppearance(next);
      return next;
    });
  }, []);

  const resetZone = useCallback((zone: AppearanceZone) => {
    setZoneColor(zone, null);
  }, [setZoneColor]);

  const resetAll = useCallback(() => {
    setColors({ ...DEFAULT_APPEARANCE });
    saveAppearance(DEFAULT_APPEARANCE);
  }, []);

  const value = useMemo(
    () => ({ colors, setZoneColor, applyPalette, syncNavbarToLogo, resetZone, resetAll }),
    [colors, setZoneColor, applyPalette, syncNavbarToLogo, resetZone, resetAll],
  );

  return (
    <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const ctx = useContext(AppearanceContext);
  if (!ctx) {
    throw new Error('useAppearance must be used within AppearanceProvider');
  }
  return ctx;
}

export function initAppearanceFromStorage() {
  applyAppearanceToDocument(loadAppearance());
}

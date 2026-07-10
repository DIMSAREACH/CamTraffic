import type { DeepPartial, Dictionary } from './types';

export function mergeDictionary(
  base: Dictionary,
  overrides?: DeepPartial<Dictionary>,
): Dictionary {
  if (!overrides) return base;

  return {
    common: { ...base.common, ...overrides.common },
    auth: { ...base.auth, ...overrides.auth },
    nav: { ...base.nav, ...overrides.nav },
    theme: { ...base.theme, ...overrides.theme },
    locale: { ...base.locale, ...overrides.locale },
    portal: { ...base.portal, ...overrides.portal },
    profile: { ...base.profile, ...overrides.profile },
    errors: { ...base.errors, ...overrides.errors },
    status: { ...base.status, ...overrides.status },
    management: { ...base.management, ...overrides.management },
  };
}

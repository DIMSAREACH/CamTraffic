import { describe, expect, it } from 'vitest';
import { translations } from '@shared/i18n/translations';

describe('admin translations', () => {
  it('includes Phase 5 footer and verify-email keys in English', () => {
    const en = translations.en;
    expect(en.footer?.adminTagline).toBeTruthy();
    expect(en.verifyEmail?.title).toBeTruthy();
  });

  it('includes notification template keys in Khmer', () => {
    const km = translations.km;
    expect(km.notificationTemplates?.title).toBeTruthy();
    expect(km.signCategories?.title).toBeTruthy();
  });
});

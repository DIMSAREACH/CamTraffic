import { describe, expect, it } from 'vitest';
import { translations } from '@shared/i18n/translations';

describe('user portal translations', () => {
  it('includes fines tab labels', () => {
    expect(translations.en.fines.tabPayments).toBeTruthy();
    expect(translations.en.paymentHistory?.title).toBeTruthy();
  });

  it('includes driver settings keys in Khmer', () => {
    expect(translations.km.driverSettings?.title).toBeTruthy();
    expect(translations.km.sidebar?.nav?.settings).toBeTruthy();
  });
});

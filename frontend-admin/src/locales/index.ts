import type { DeepPartial, Dictionary } from '@camtraffic/ui';

export const ADMIN_LOCALE_STORAGE_KEY = 'camtraffic-admin-locale';

export const adminLocaleOverrides: Record<'en' | 'km', DeepPartial<Dictionary>> = {
  en: {
    portal: {
      subtitle: 'Super Administrator Portal',
      badge: 'Admin Portal',
      demoTitle: 'Khmer & English Localization',
      demoSubtitle: 'Task 009 — bilingual admin experience',
    },
  },
  km: {
    portal: {
      subtitle: 'ផ្ទាំងគ្រប់គ្រងអ្នកគ្រប់គ្រងជាន់ខ្ពស់',
      badge: 'ផ្ទាំងគ្រប់គ្រង',
      demoTitle: 'ការធ្វើឱ្យស្របភាសាខ្មែរ និងអង់គ្លេស',
      demoSubtitle: 'កិច្ចការ ០០៩ — បទពិសោធន៍អ្នកគ្រប់គ្រងពីរភាសា',
    },
  },
};

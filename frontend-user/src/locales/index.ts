import type { DeepPartial, Dictionary } from '@camtraffic/ui';

export const USER_LOCALE_STORAGE_KEY = 'camtraffic-user-locale';

export const userLocaleOverrides: Record<'en' | 'km', DeepPartial<Dictionary>> = {
  en: {
    portal: {
      subtitle: 'Traffic Officer & Driver Portal',
      badge: 'Officer / Driver Portal',
      demoTitle: 'Khmer & English Localization',
      demoSubtitle: 'Task 009 — bilingual officer and driver experience',
    },
  },
  km: {
    portal: {
      subtitle: 'ផ្ទាំងមន្ត្រីចរាចរណ៍ និងអ្នកបើកបរ',
      badge: 'ផ្ទាំងមន្ត្រី / អ្នកបើកបរ',
      demoTitle: 'ការធ្វើឱ្យស្របភាសាខ្មែរ និងអង់គ្លេស',
      demoSubtitle: 'កិច្ចការ ០០៩ — បទពិសោធន៍មន្ត្រី និងអ្នកបើកបរពីរភាសា',
    },
  },
};

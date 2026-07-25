export const t = {
  en: {
    appName: 'CamTraffic Citizen',
    dashboard: 'Dashboard',
    fines: 'My Fines',
    violations: 'Violations',
    appeals: 'Appeals',
    vehicles: 'My Vehicles',
    login: 'Sign in',
    logout: 'Sign out',
    pending: 'Pending',
    paid: 'Paid',
    overdue: 'Overdue',
    payNow: 'Pay now',
    submitAppeal: 'Submit appeal',
    welcome: 'Welcome back',
    noFines: 'No fines found',
  },
  km: {
    appName: 'CamTraffic រដ្ឋបាល',
    dashboard: 'ផ្ទាំងគ្រប់គ្រង',
    fines: 'កំណត់ពិន័យ',
    violations: 'ការប្រព្រឹត្តិល្មើស',
    appeals: 'អំណះអំណារ',
    vehicles: 'យានយន្ត',
    login: 'ចូល',
    logout: 'ចេញ',
    pending: 'មិនទាន់បង់',
    paid: 'បានបង់',
    overdue: 'ហួសកំណត់',
    payNow: 'បង់ឥឡូវ',
    submitAppeal: 'ដាក់អំណះអំណារ',
    welcome: 'សូមស្វាគមន៍',
    noFines: 'គ្មានកំណត់ពិន័យ',
  },
} as const;

export type Locale = keyof typeof t;

export function useLocale(): Locale {
  if (typeof window === 'undefined') return 'km';
  return (localStorage.getItem('camtraffic_locale') as Locale) || 'km';
}

export function setLocale(locale: Locale) {
  localStorage.setItem('camtraffic_locale', locale);
}

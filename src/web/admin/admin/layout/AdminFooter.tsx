import { useLanguage } from '@shared/context/LanguageContext';

export function AdminFooter() {
  const { t } = useLanguage();
  const year = new Date().getFullYear();

  return (
    <footer className="admin-footer border-t border-slate-200/80 dark:border-slate-700/60 px-5 py-3 text-center text-xs text-slate-500 dark:text-slate-400">
      <p>
        © {year} CamTraffic · {t('footer.adminTagline')}
      </p>
    </footer>
  );
}

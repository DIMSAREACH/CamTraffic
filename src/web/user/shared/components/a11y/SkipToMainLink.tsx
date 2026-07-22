import { useLanguage } from '@shared/context/LanguageContext';

type SkipToMainLinkProps = {
  targetId?: string;
};

/** Visually hidden until focused — jumps keyboard users past chrome to main content. */
export function SkipToMainLink({ targetId = 'main-content' }: SkipToMainLinkProps) {
  const { t } = useLanguage();

  return (
    <a href={`#${targetId}`} className="skip-to-main">
      {t('a11y.skipToMain')}
    </a>
  );
}

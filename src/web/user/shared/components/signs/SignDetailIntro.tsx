import type { ReactNode } from 'react';
import { Hash, Pencil, Trash2 } from 'lucide-react';
import { useLanguage } from '@shared/context/LanguageContext';
import { SignNameLabels } from '@shared/components/signs/SignNameLabels';
import type { SignCategory, TrafficSign } from '@shared/types';

type CatStyle = {
  gradient: string;
  glow: string;
  bg: string;
  color: string;
  border: string;
  signBg: string;
  signBorder: string;
  signText: string;
};

type Props = {
  sign: TrafficSign;
  categoryLabel: string;
  catStyle: CatStyle;
  canManage?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
};

function CategoryBadge({
  category,
  children,
  catStyle,
}: {
  category: SignCategory;
  children: ReactNode;
  catStyle: CatStyle;
}) {
  return (
    <span
      className="signs-category-badge inline-flex items-center rounded-full px-3 py-1 text-sm font-bold"
      style={{
        background: catStyle.gradient,
        color: '#fff',
        border: `1px solid ${catStyle.signBorder}`,
        boxShadow: `0 2px 10px ${catStyle.glow}`,
      }}
    >
      {children}
    </span>
  );
}

export function SignDetailIntro({
  sign,
  categoryLabel,
  catStyle: c,
  canManage = false,
  onEdit,
  onDelete,
}: Props) {
  const { t } = useLanguage();

  return (
    <div
      className="signs-detail-intro"
      style={{
        background: `linear-gradient(165deg, ${c.bg} 0%, var(--card) 48%)`,
        borderBottom: `1px solid ${c.border}`,
      }}
    >
      <div className="signs-detail-intro__meta">
        <CategoryBadge category={sign.category} catStyle={c}>
          {categoryLabel}
        </CategoryBadge>
        <span className="signs-detail-intro__kingdom">{t('pages.signs.kingdom')}</span>
      </div>

      <div className="signs-detail-intro__titles">
        <SignNameLabels sign={sign} size="detail" />
      </div>

      <div
        className="signs-detail-intro__code"
        style={{ borderColor: c.border, background: 'var(--card)' }}
      >
        <div
          className="signs-detail-intro__code-icon"
          style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}
        >
          <Hash size={18} strokeWidth={2.25} />
        </div>
        <div className="signs-detail-intro__code-text min-w-0">
          <p className="signs-detail-intro__code-label m-0">{t('pages.signs.officialCode')}</p>
          <p className="signs-detail-intro__code-value m-0" style={{ color: c.color }}>
            {sign.sign_code}
          </p>
        </div>
      </div>

      {canManage ? (
        <div className="signs-detail-intro__actions">
          <button
            type="button"
            onClick={onEdit}
            className="signs-detail-intro__btn signs-detail-intro__btn--edit"
          >
            <Pencil size={16} strokeWidth={2} />
            {t('pages.signs.editSign')}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="signs-detail-intro__btn signs-detail-intro__btn--delete"
          >
            <Trash2 size={16} strokeWidth={2} />
            {t('pages.signs.deleteSign')}
          </button>
        </div>
      ) : null}
    </div>
  );
}

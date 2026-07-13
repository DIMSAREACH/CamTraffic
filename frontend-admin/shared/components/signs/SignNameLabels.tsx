import { signDisplayNames, type SignNameFields } from '@shared/utils/signDisplayNames';

type Props = {
  sign: SignNameFields;
  size?: 'sm' | 'md' | 'hero' | 'detail';
  className?: string;
  centered?: boolean;
};

/** Khmer title + English subtitle — used on sign cards and tables. */
export function SignNameLabels({ sign, size = 'md', className = '', centered = false }: Props) {
  const { km, en } = signDisplayNames(sign);
  const showEnglish = Boolean(en && en !== km);

  if (!km && !en) return null;

  const align = centered ? ' text-center' : '';
  const titleClass =
    size === 'detail'
      ? 'sign-name-labels__km signs-detail-intro__km m-0'
      : size === 'hero'
        ? `sign-name-labels__km dashboard-stat__value leading-snug line-clamp-2 m-0${align}`
      : size === 'sm'
        ? `sign-name-labels__km text-xs font-bold leading-snug line-clamp-2 m-0${align}`
        : `sign-name-labels__km signs-card__name dashboard-card__title leading-snug line-clamp-2 font-bold m-0${align}`;
  const subClass =
    size === 'detail'
      ? 'sign-name-labels__en signs-detail-intro__en m-0'
      : size === 'hero'
        ? `sign-name-labels__en text-base font-medium leading-snug line-clamp-2 mt-1 m-0${align}`
      : size === 'sm'
        ? `sign-name-labels__en text-[10.5px] leading-snug line-clamp-2 mt-0.5 m-0${align}`
        : `sign-name-labels__en signs-card__name-en dashboard-text__caption mt-1 line-clamp-2 m-0${align}`;

  return (
    <div className={`${className}${align}`.trim()}>
      {km ? (
        <p className={titleClass} style={size === 'detail' ? undefined : { color: 'var(--foreground)' }}>
          {km}
        </p>
      ) : en ? (
        <p className={titleClass} style={size === 'detail' ? undefined : { color: 'var(--foreground)' }}>
          {en}
        </p>
      ) : null}
      {showEnglish ? (
        <p
          className={subClass}
          style={size === 'detail' ? undefined : { color: 'var(--foreground)', fontWeight: 600 }}
        >
          {en}
        </p>
      ) : null}
    </div>
  );
}

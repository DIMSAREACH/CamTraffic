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
  const title = (km || en || sign.sign_code || 'Traffic sign').trim();
  const subtitle = en && en !== title ? en : '';

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
      <p className={titleClass} style={size === 'detail' ? undefined : { color: '#0f172a' }}>
        {title}
      </p>
      {subtitle ? (
        <p
          className={subClass}
          style={size === 'detail' ? undefined : { color: '#475569', fontWeight: 600 }}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

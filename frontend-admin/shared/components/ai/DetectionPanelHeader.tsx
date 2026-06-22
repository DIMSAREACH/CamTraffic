import type { LucideIcon } from 'lucide-react';
import { cn } from '@shared/components/ui/utils';

export function DetectionPanelHeader({
  title,
  subtitle,
  eyebrow,
  highlight,
  icon: Icon,
  accentColor,
  gradient,
  size = 'default',
  end,
  footer,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  eyebrow?: React.ReactNode;
  highlight?: React.ReactNode;
  icon?: LucideIcon;
  accentColor?: string;
  gradient?: string;
  size?: 'default' | 'hero';
  end?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  const isGradient = Boolean(gradient);
  const iconStyle = !isGradient && accentColor
    ? { color: accentColor, borderColor: `${accentColor}33`, background: `${accentColor}14` }
    : undefined;

  return (
    <div
      className={cn(
        'ai-detection-panel-header dashboard-panel-header',
        isGradient && 'ai-detection-panel-header--gradient',
        size === 'hero' && 'ai-detection-panel-header--hero',
        className,
      )}
      style={gradient ? { background: gradient } : undefined}
    >
      {isGradient && <div className="ai-detection-panel-header__decor" aria-hidden />}
      <div className="ai-detection-panel-header__row relative">
        {Icon && (
          <div className="ai-detection-panel-header__icon" style={iconStyle}>
            <Icon size={size === 'hero' ? 20 : 18} strokeWidth={2} color={isGradient ? 'white' : undefined} />
          </div>
        )}
        <div className="ai-detection-panel-header__text min-w-0 flex-1">
          {eyebrow && <p className="ai-detection-panel-header__eyebrow">{eyebrow}</p>}
          <h3 className="ai-detection-panel-header__title">{title}</h3>
          {highlight && <p className="ai-detection-panel-header__highlight">{highlight}</p>}
          {subtitle && <p className="ai-detection-panel-header__subtitle">{subtitle}</p>}
        </div>
        {end && <div className="ai-detection-panel-header__end flex-shrink-0">{end}</div>}
      </div>
      {footer && <div className="ai-detection-panel-header__footer relative">{footer}</div>}
    </div>
  );
}

export function DetectionPanelBody({
  children,
  className,
  floating = false,
}: {
  children: React.ReactNode;
  className?: string;
  floating?: boolean;
}) {
  return (
    <div className={cn('ai-detection-panel-body', floating && 'ai-detection-panel-body--floating', className)}>
      {children}
    </div>
  );
}

import { cn } from '@shared/components/ui/utils';
import camtrafficEmblem from '@shared/assets/logo/camtraffic-emblem.png';

interface CamTrafficLogoProps {
  size?: number;
  className?: string;
  alt?: string;
}

/** Norton University seal — used as the app brand mark */
export function CamTrafficLogo({ size = 40, className, alt = 'Norton University' }: CamTrafficLogoProps) {
  const pad = Math.max(3, Math.round(size * 0.1));
  return (
    <img
      src={camtrafficEmblem}
      alt={alt}
      width={size}
      height={size}
      draggable={false}
      decoding="async"
      fetchPriority="high"
      className={cn('camtraffic-logo-img', className)}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        padding: pad,
      }}
    />
  );
}

import { cn } from '@shared/components/ui/utils';
import camtrafficEmblem from '@shared/assets/logo/camtraffic-emblem.png';

interface CamTrafficLogoProps {
  size?: number;
  className?: string;
  alt?: string;
}

/** Official CamTraffic / Cambodia traffic emblem */
export function CamTrafficLogo({ size = 40, className, alt = 'CamTraffic' }: CamTrafficLogoProps) {
  return (
    <img
      src={camtrafficEmblem}
      alt={alt}
      width={size}
      height={size}
      draggable={false}
      decoding="async"
      className={cn('camtraffic-logo-img', className)}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
    />
  );
}

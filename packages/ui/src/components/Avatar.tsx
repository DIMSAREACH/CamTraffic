import type { HTMLAttributes } from 'react';
import { cn } from '@camtraffic/utils';

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'away' | 'busy';
}

export function Avatar({
  src,
  alt = '',
  fallback,
  size = 'md',
  status,
  className,
  ...props
}: AvatarProps) {
  const initials = fallback
    ? fallback
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '';

  return (
    <div className={cn('ct-avatar', `ct-avatar--${size}`, className)} {...props}>
      {src ? (
        <img src={src} alt={alt} className="ct-avatar__image" />
      ) : (
        <span className="ct-avatar__fallback">{initials}</span>
      )}
      {status ? <span className={cn('ct-avatar__status', `ct-avatar__status--${status}`)} /> : null}
    </div>
  );
}

import { useState } from 'react';
import { cn } from '@shared/components/ui/utils';
import { getProfileImageSrc } from '@shared/utils/profileImage';

const SIZE = {
  xs: 'w-9 h-9 text-xs',
  sm: 'w-10 h-10 text-sm',
  md: 'w-11 h-11 text-base',
} as const;

interface NavbarProfileAvatarProps {
  initials: string;
  gradient?: string;
  profileImage?: string | null;
  alt?: string;
  size?: keyof typeof SIZE;
  showStatus?: boolean;
  className?: string;
}

export function NavbarProfileAvatar({
  initials,
  gradient,
  profileImage,
  alt,
  size = 'sm',
  showStatus = true,
  className,
}: NavbarProfileAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const src = imgFailed ? null : getProfileImageSrc(profileImage);

  return (
    <div className={cn('relative flex-shrink-0', className)}>
      <div className={cn('profile-avatar-shell shadow-sm', SIZE[size])}>
        {src ? (
          <img
            src={src}
            alt={alt || initials}
            className="profile-avatar-photo"
            draggable={false}
            decoding="async"
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span
            className={cn(
              'flex h-full w-full items-center justify-center font-extrabold text-white',
              size === 'xs' ? 'text-xs' : 'text-sm',
            )}
            style={{ background: gradient }}
          >
            {initials}
          </span>
        )}
      </div>
      {showStatus && (
        <span
          className={cn(
            'app-navbar__avatar-status absolute z-10 rounded-full',
            size === 'md' ? 'app-navbar__avatar-status--md' : 'app-navbar__avatar-status--sm',
          )}
          title="Online"
          aria-hidden
        />
      )}
    </div>
  );
}

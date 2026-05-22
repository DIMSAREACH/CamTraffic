import { cn } from '@shared/components/ui/utils';
import { getProfileImageSrc } from '@shared/utils/profileImage';

const SIZE = {
  sm: 'w-10 h-10 text-sm',
  md: 'w-11 h-11 text-base',
} as const;

interface NavbarProfileAvatarProps {
  initials: string;
  gradient?: string;
  profileImage?: string | null;
  size?: keyof typeof SIZE;
  showStatus?: boolean;
  className?: string;
}

export function NavbarProfileAvatar({
  initials,
  gradient,
  profileImage,
  size = 'sm',
  showStatus = true,
  className,
}: NavbarProfileAvatarProps) {
  const src = getProfileImageSrc(profileImage);

  return (
    <div className={cn('relative flex-shrink-0', className)}>
      <div className={cn('profile-avatar-shell shadow-sm', SIZE[size])}>
        {src ? (
          <img
            src={src}
            alt=""
            className="profile-avatar-photo"
            draggable={false}
            decoding="sync"
            loading="eager"
          />
        ) : (
          <span
            className="flex h-full w-full items-center justify-center text-sm font-extrabold text-white"
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

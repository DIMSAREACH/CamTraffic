import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { useAuth } from '@shared/context/AuthContext';
import { usersAPI } from '@shared/services/api';
import { getProfileImageSrc } from '@shared/utils/profileImage';
import { prepareProfileImageForUpload } from '@shared/utils/profileImageProcess';
import { cn } from '@shared/components/ui/utils';
import { toast } from 'sonner';
import type { UserRole } from '@shared/types';

const ROLE_GRADIENT: Record<UserRole, string> = {
  admin: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
  police: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
  driver: 'linear-gradient(135deg, #06B6D4, #0891B2)',
};

const SIZE_CLASS = {
  md: 'w-16 h-16 text-lg',
  lg: 'w-20 h-20 text-xl',
  xl: 'w-24 h-24 text-2xl',
} as const;

interface WelcomeProfileAvatarProps {
  role?: UserRole;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
  /** welcome = dashboard display only; card = profile page with upload */
  variant?: 'welcome' | 'card';
}

function AvatarContent({
  imageUrl,
  initials,
  gradient,
  variant = 'welcome',
}: {
  imageUrl: string | null;
  initials: string;
  gradient: string;
  variant?: 'welcome' | 'card';
}) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className="profile-avatar-photo"
        draggable={false}
        decoding="sync"
        loading="eager"
      />
    );
  }
  return (
    <span
      className="flex w-full h-full items-center justify-center font-black text-white"
      style={{ background: gradient }}
    >
      {initials}
    </span>
  );
}

export function WelcomeProfileAvatar({
  role,
  size,
  className,
  variant = 'welcome',
}: WelcomeProfileAvatarProps) {
  const { user, updateUser } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  if (!user) return null;

  const userRole = role ?? user.role;
  const gradient = ROLE_GRADIENT[userRole];
  const resolvedSize = size ?? (variant === 'welcome' ? 'xl' : 'lg');
  const imageUrl = preview ?? getProfileImageSrc(user.profile_image);
  const initials = user.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const shellClass = cn(
    'profile-avatar-shell',
    SIZE_CLASS[resolvedSize],
    variant === 'welcome' && 'profile-avatar-shell--welcome ring-2 ring-white/25 shadow-[0_8px_24px_rgba(0,0,0,0.35)]',
    variant === 'card' && 'profile-avatar-shell--card border-4 border-white',
    className,
  );

  if (variant === 'welcome') {
    return (
      <div className={shellClass} aria-hidden>
        <AvatarContent imageUrl={imageUrl} initials={initials} gradient={gradient} variant="welcome" />
      </div>
    );
  }

  const handleFile = async (file: File) => {
    let prepared: File;
    try {
      prepared = await prepareProfileImageForUpload(file);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invalid image');
      return;
    }

    const localPreview = URL.createObjectURL(prepared);
    setPreview(localPreview);
    setUploading(true);

    try {
      const updated = await usersAPI.uploadProfileImage(user.id, prepared);
      updateUser(updated);
      setPreview(null);
      toast.success('Profile photo updated');
    } catch (err) {
      setPreview(null);
      const msg = err instanceof Error ? err.message : 'Failed to upload profile photo';
      toast.error(msg);
    } finally {
      setUploading(false);
      URL.revokeObjectURL(localPreview);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className={cn('flex-shrink-0', className)}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={cn(
          shellClass,
          'group relative transition-transform',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60',
          uploading ? 'opacity-80 cursor-wait' : 'hover:scale-[1.02] active:scale-[0.98] cursor-pointer',
        )}
        style={{ boxShadow: '0 8px 24px rgba(15,23,42,0.15)' }}
        aria-label="Upload profile photo"
        title="Upload profile photo"
      >
        <AvatarContent imageUrl={imageUrl} initials={initials} gradient={gradient} variant="card" />

        <span
          className="absolute inset-0 z-10 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity"
          aria-hidden
        >
          {uploading ? (
            <Loader2 size={20} className="text-white animate-spin" />
          ) : (
            <Camera size={20} className="text-white" />
          )}
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
    </div>
  );
}

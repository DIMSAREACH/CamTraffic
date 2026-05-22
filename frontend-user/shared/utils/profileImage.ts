/** Resolve profile_image from API to a browser-loadable URL. */
export function getProfileImageUrl(profileImage?: string | null): string | null {
  if (!profileImage) return null;
  if (
    profileImage.startsWith('http') ||
    profileImage.startsWith('blob:') ||
    profileImage.startsWith('data:')
  ) {
    return profileImage;
  }

  const path = profileImage.startsWith('/') ? profileImage : `/${profileImage}`;

  if (typeof window !== 'undefined') {
    return `${window.location.origin}${path}`;
  }

  const apiBase = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';
  const origin = apiBase.replace(/\/api\/?$/, '') || 'http://127.0.0.1:8000';
  return `${origin}${path}`;
}

/** URL with cache-bust query from stored path (filename changes on re-upload). */
export function getProfileImageSrc(profileImage?: string | null): string | null {
  const base = getProfileImageUrl(profileImage);
  if (!base || !profileImage || profileImage.startsWith('blob:') || profileImage.startsWith('data:')) {
    return base;
  }
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}v=${encodeURIComponent(profileImage)}`;
}

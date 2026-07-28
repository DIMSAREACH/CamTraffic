import { useEffect, useState, type ReactNode } from 'react';
import { ImageOff } from 'lucide-react';
import type { EvidenceArchiveItem } from '@shared/types';

type SourceType = EvidenceArchiveItem['source_type'];

type EvidenceSignImageProps = {
  src: string;
  alt: string;
  sourceType: SourceType;
  className?: string;
  imgClassName?: string;
  loading?: 'lazy' | 'eager';
  /** Full photo preview — no sign plate frame (dialogs / lightbox). */
  plain?: boolean;
  /** Label shown when the file is missing on the server. */
  missingLabel?: string;
};

/**
 * Only catalog sign artwork gets the plate treatment. Camera captures — including
 * `/media/ai/evidence/signs/` annotated frames — must render as plain photos.
 */
function isSignArtwork(src: string): boolean {
  return src.includes('/demo-signs/') || src.includes('/sign-catalog/');
}

export function EvidenceSignImage({
  src,
  alt,
  sourceType,
  className = '',
  imgClassName = '',
  loading,
  plain = false,
  missingLabel,
}: EvidenceSignImageProps) {
  const [broken, setBroken] = useState(false);

  // A new src must get a fresh chance to load.
  useEffect(() => { setBroken(false); }, [src]);

  if (!src || broken) {
    return (
      <div className={`evidence-archive-sign-frame evidence-archive-sign-frame--empty ${className}`.trim()}>
        <ImageOff size={22} aria-hidden />
        {missingLabel ? <span className="evidence-archive-sign-frame__missing">{missingLabel}</span> : null}
      </div>
    );
  }

  if (!plain && sourceType === 'detection' && isSignArtwork(src)) {
    return (
      <div className={`evidence-archive-sign-frame evidence-archive-sign-frame--detection ${className}`.trim()}>
        <div className="evidence-archive-sign-frame__glow" aria-hidden />
        <img
          src={src}
          alt={alt}
          className={`evidence-archive-sign-frame__img ${imgClassName}`.trim()}
          loading={loading}
          onError={() => setBroken(true)}
        />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={imgClassName || className}
      loading={loading}
      onError={() => setBroken(true)}
    />
  );
}

type EvidenceCropThumbProps = {
  src: string;
  label: string;
  icon: ReactNode;
  onClick?: () => void;
};

/** Small vehicle/plate crop. Removes itself when the file is missing so no broken icon shows. */
export function EvidenceCropThumb({ src, label, icon, onClick }: EvidenceCropThumbProps) {
  const [broken, setBroken] = useState(false);

  useEffect(() => { setBroken(false); }, [src]);

  if (!src || broken) return null;

  const inner = (
    <>
      <span className="evidence-archive-card__thumb-icon" aria-hidden>{icon}</span>
      <img src={src} alt="" loading="lazy" onError={() => setBroken(true)} />
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="evidence-archive-card__thumb" title={label} aria-label={label}>
        {inner}
      </button>
    );
  }

  return (
    <div className="evidence-archive-card__thumb" title={label} aria-label={label}>
      {inner}
    </div>
  );
}

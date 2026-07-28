import { useEffect, useState } from 'react';
import { AlertCircle, Camera, Car, Hash } from 'lucide-react';
import { getProfileImageUrl } from '@shared/utils/profileImage';
import { logDisplay } from '@shared/utils/detectionDisplay';
import { useLanguage } from '@shared/context/LanguageContext';
import type { AIDetectionLog } from '@shared/types';

/** Prefer real upload, then evidence snapshots. URLs may already be absolute `/media/...`. */
export function getDetectionThumbCandidates(log: AIDetectionLog): string[] {
  const raw = [
    log.uploaded_image,
    log.vehicle_snapshot,
    log.plate_snapshot,
  ];
  const out: string[] = [];
  for (const value of raw) {
    if (!value || !String(value).trim()) continue;
    const url = getProfileImageUrl(value) || value;
    if (url && !out.includes(url)) out.push(url);
  }
  return out;
}

function modeIcon(mode: string) {
  if (mode === 'vehicle') return Car;
  if (mode === 'plate') return Hash;
  if (mode === 'no_sign' || mode === 'unknown_sign') return AlertCircle;
  return Camera;
}

type ThumbProps = {
  log: AIDetectionLog;
  accent: string;
  mode: string;
  onClick?: () => void;
  className?: string;
  imgClassName?: string;
  emptyClassName?: string;
  iconSize?: number;
  asButton?: boolean;
};

/** Shared detection thumbnail with multi-source fallback (upload → snapshots). */
export function DetectionThumb({
  log,
  accent,
  mode,
  onClick,
  className = 'enforcement-page__log-thumb',
  imgClassName = 'enforcement-page__log-thumb-img',
  emptyClassName = 'enforcement-page__log-thumb enforcement-page__log-thumb--empty',
  iconSize = 16,
  asButton = true,
}: ThumbProps) {
  const { locale } = useLanguage();
  const speechLocale = locale === 'en' ? 'en' : 'km';
  const hero = logDisplay(log, speechLocale);
  const candidates = getDetectionThumbCandidates(log);
  const candidateKey = candidates.join('|');
  const [index, setIndex] = useState(0);
  const src = candidates[index] || null;
  const FallbackIcon = modeIcon(mode);

  useEffect(() => {
    setIndex(0);
  }, [log.id, candidateKey]);

  const onError = () => {
    setIndex((i) => (i + 1 < candidates.length ? i + 1 : candidates.length));
  };

  if (src && index < candidates.length) {
    const img = (
      <img
        src={src}
        alt={hero.title}
        title={hero.title}
        className={imgClassName}
        style={{ boxShadow: `0 0 0 1.5px ${accent}30`, objectFit: 'cover', display: 'block' }}
        onError={onError}
        loading="lazy"
      />
    );
    if (!asButton) return img;
    return (
      <button type="button" className={className} onClick={onClick}>
        {img}
      </button>
    );
  }

  const empty = (
    <>
      <FallbackIcon size={iconSize} style={{ color: accent }} />
    </>
  );

  if (!asButton) {
    return (
      <div
        className={emptyClassName}
        style={{ background: `${accent}18`, borderColor: `${accent}35` }}
        aria-label={hero.title}
      >
        {empty}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={emptyClassName}
      style={{ background: `${accent}18`, borderColor: `${accent}35` }}
      onClick={onClick}
      aria-label={hero.title}
    >
      {empty}
    </button>
  );
}

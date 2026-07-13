import { useEffect, useState } from 'react';

type Variant = 'preview' | 'result';

const MAX_HEIGHT = { preview: 340, result: 420 } as const;
const SMALL_EDGE = 280;

export function DetectionDisplayImage({
  src,
  alt,
  variant,
  className = '',
  fill = false,
}: {
  src: string;
  alt: string;
  variant: Variant;
  className?: string;
  fill?: boolean;
}) {
  const [sharpSrc, setSharpSrc] = useState<string | null>(null);
  const imgClass =
    `${variant === 'result' ? 'ai-detect-result-img' : 'ai-detect-preview-img'}${fill ? ' ai-detect-preview-img--fill' : ''} ${className}`.trim();

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    setSharpSrc(null);

    const img = new Image();
    if (!src.startsWith('blob:') && !src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }

    img.onload = () => {
      if (cancelled) return;
      const { naturalWidth: w, naturalHeight: h } = img;
      const longest = Math.max(w, h);

      if (!w || !h || longest >= SMALL_EDGE) {
        setSharpSrc(src);
        return;
      }

      const maxH = MAX_HEIGHT[variant];
      const maxW = variant === 'result' ? 560 : 480;
      const targetLong = Math.min(
        480,
        Math.max(320, longest * 4),
        Math.floor(maxW * (longest / w)),
        Math.floor(maxH * (longest / h)),
      );
      const scale = targetLong / longest;
      const dw = Math.max(1, Math.round(w * scale));
      const dh = Math.max(1, Math.round(h * scale));

      const canvas = document.createElement('canvas');
      canvas.width = dw;
      canvas.height = dh;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setSharpSrc(src);
        return;
      }
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, dw, dh);
      canvas.toBlob(
        (blob) => {
          if (cancelled || !blob) {
            setSharpSrc(src);
            return;
          }
          objectUrl = URL.createObjectURL(blob);
          setSharpSrc(objectUrl);
        },
        'image/png',
      );
    };

    img.onerror = () => {
      if (!cancelled) setSharpSrc(src);
    };
    img.src = src;

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, variant]);

  const displaySrc = sharpSrc ?? src;

  return (
    <div className="ai-detect-image-wrap">
      <img
        src={displaySrc}
        alt={alt}
        decoding="sync"
        draggable={false}
        className={imgClass}
        style={fill ? undefined : { maxHeight: MAX_HEIGHT[variant] }}
      />
    </div>
  );
}

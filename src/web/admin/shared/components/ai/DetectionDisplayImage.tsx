import { useEffect, useState } from 'react';
import { getAccessToken } from '@shared/utils/authStorage';

type Variant = 'preview' | 'result';

const MAX_HEIGHT = { preview: 340, result: 420 } as const;
const SMALL_EDGE = 280;

function isCrossOriginHttp(url: string): boolean {
  if (!/^https?:\/\//i.test(url)) return false;
  try {
    return new URL(url).origin !== window.location.origin;
  } catch {
    return true;
  }
}

/** Load remote R2/CDN media via API proxy so canvas/upscale works without bucket CORS. */
async function resolveDisplaySource(src: string): Promise<{ src: string; revoke?: string }> {
  if (!isCrossOriginHttp(src)) {
    return { src };
  }
  try {
    const token = getAccessToken();
    const res = await fetch(`/api/media/proxy/?url=${encodeURIComponent(src)}`, {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return { src };
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    return { src: objectUrl, revoke: objectUrl };
  } catch {
    return { src };
  }
}

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
    let upscaledUrl: string | null = null;
    let proxiedUrl: string | null = null;

    setSharpSrc(null);

    void (async () => {
      const resolved = await resolveDisplaySource(src);
      if (cancelled) {
        if (resolved.revoke) URL.revokeObjectURL(resolved.revoke);
        return;
      }
      proxiedUrl = resolved.revoke || null;
      const workingSrc = resolved.src;

      const img = new Image();
      // Never set crossOrigin on bare R2 URLs — that triggers browser CORS failures.
      if (
        !workingSrc.startsWith('blob:')
        && !workingSrc.startsWith('data:')
        && !isCrossOriginHttp(workingSrc)
      ) {
        img.crossOrigin = 'anonymous';
      }

      img.onload = () => {
        if (cancelled) return;
        const { naturalWidth: w, naturalHeight: h } = img;
        const longest = Math.max(w, h);

        if (!w || !h || longest >= SMALL_EDGE) {
          setSharpSrc(workingSrc);
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
          setSharpSrc(workingSrc);
          return;
        }
        ctx.imageSmoothingEnabled = false;
        try {
          ctx.drawImage(img, 0, 0, dw, dh);
        } catch {
          setSharpSrc(workingSrc);
          return;
        }
        canvas.toBlob(
          (blob) => {
            if (cancelled || !blob) {
              setSharpSrc(workingSrc);
              return;
            }
            upscaledUrl = URL.createObjectURL(blob);
            setSharpSrc(upscaledUrl);
          },
          'image/png',
        );
      };

      img.onerror = () => {
        if (!cancelled) setSharpSrc(src);
      };
      img.src = workingSrc;
    })();

    return () => {
      cancelled = true;
      if (upscaledUrl) URL.revokeObjectURL(upscaledUrl);
      if (proxiedUrl) URL.revokeObjectURL(proxiedUrl);
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

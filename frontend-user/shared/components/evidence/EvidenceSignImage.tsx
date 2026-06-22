import type { EvidenceArchiveItem } from '@shared/types';

type SourceType = EvidenceArchiveItem['source_type'];

type EvidenceSignImageProps = {
  src: string;
  alt: string;
  sourceType: SourceType;
  className?: string;
  imgClassName?: string;
  loading?: 'lazy' | 'eager';
};

function usesUploadedSignMatte(src: string, sourceType: SourceType): boolean {
  return sourceType === 'detection' && !src.includes('/demo-signs/');
}

/** Renders sign detections on a vibrant plate; API uploads are circle-clipped to hide black corners. */
export function EvidenceSignImage({
  src,
  alt,
  sourceType,
  className = '',
  imgClassName = '',
  loading,
}: EvidenceSignImageProps) {
  if (sourceType === 'detection') {
    const matte = usesUploadedSignMatte(src, sourceType);
    return (
      <div className={`evidence-archive-sign-frame evidence-archive-sign-frame--detection ${className}`.trim()}>
        <div className="evidence-archive-sign-frame__glow" aria-hidden />
        <img
          src={src}
          alt={alt}
          className={`evidence-archive-sign-frame__img${matte ? ' evidence-archive-sign-frame__img--matte' : ''} ${imgClassName}`.trim()}
          loading={loading}
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
    />
  );
}

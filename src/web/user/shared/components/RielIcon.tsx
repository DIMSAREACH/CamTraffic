import type { LucideProps } from 'lucide-react';

/** Khmer Riel symbol for stat cards (matches KHR currency display). */
export function RielIcon({ size = 24, className, style }: LucideProps) {
  const px = typeof size === 'number' ? size : 24;
  return (
    <span
      className={className}
      style={{
        fontSize: px * 1.05,
        fontWeight: 800,
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Noto Sans Khmer', 'Kantumruy Pro', system-ui, sans-serif",
        ...style,
      }}
      aria-hidden
    >
      ៛
    </span>
  );
}

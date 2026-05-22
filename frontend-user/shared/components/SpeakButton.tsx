import { Volume2, Square } from 'lucide-react';

type SpeakButtonProps = {
  isActive: boolean;
  onClick: () => void;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
};

export function SpeakButton({
  isActive,
  onClick,
  label = 'Listen',
  size = 'sm',
  className = '',
}: SpeakButtonProps) {
  const dim = size === 'md' ? 'w-9 h-9' : 'w-7 h-7';
  const icon = size === 'md' ? 16 : 13;

  return (
    <button
      type="button"
      title={isActive ? 'Stop' : label}
      aria-label={isActive ? 'Stop speaking' : label}
      onClick={onClick}
      className={`${dim} rounded-lg flex items-center justify-center flex-shrink-0 transition-all cursor-pointer border ${className} ${
        isActive
          ? 'bg-violet-500/15 border-violet-400/40 text-violet-600 dark:text-violet-300'
          : 'bg-muted/80 border-border text-muted-foreground hover:text-foreground hover:bg-muted'
      }`}
    >
      {isActive ? <Square size={icon} fill="currentColor" /> : <Volume2 size={icon} />}
    </button>
  );
}

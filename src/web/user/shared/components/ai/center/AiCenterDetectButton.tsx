import { Button } from '@shared/components/ui/button';
import { cn } from '@shared/components/ui/utils';
import type { ComponentProps } from 'react';

type Tone = 'violet' | 'rose' | 'cyan' | 'emerald';

type AiCenterDetectButtonProps = ComponentProps<typeof Button> & {
  tone?: Tone;
};

export function AiCenterDetectButton({
  tone = 'violet',
  className,
  size = 'lg',
  ...props
}: AiCenterDetectButtonProps) {
  return (
    <Button
      size={size}
      className={cn('ai-center-cta', `ai-center-cta--${tone}`, 'w-full gap-2', className)}
      {...props}
    />
  );
}

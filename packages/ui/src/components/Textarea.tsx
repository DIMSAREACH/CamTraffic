import type { TextareaHTMLAttributes } from 'react';
import { cn } from '@camtraffic/utils';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Textarea({ label, error, hint, className, id, ...props }: TextareaProps) {
  const textareaId = id ?? props.name;

  return (
    <label className={cn('ct-field', className)} htmlFor={textareaId}>
      {label ? <span className="ct-field__label">{label}</span> : null}
      <textarea
        id={textareaId}
        className={cn('ct-textarea', error && 'ct-textarea--error')}
        {...props}
      />
      {error ? <span className="ct-field__error">{error}</span> : null}
      {!error && hint ? <span className="ct-field__hint">{hint}</span> : null}
    </label>
  );
}

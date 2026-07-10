import type { InputHTMLAttributes } from 'react';
import { cn } from '@camtraffic/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className, id, required, ...props }: InputProps) {
  const inputId = id ?? props.name;
  const errorId = error ? `${inputId}-error` : undefined;
  const hintId = hint ? `${inputId}-hint` : undefined;

  return (
    <label className={cn('ct-field', className)} htmlFor={inputId}>
      {label ? (
        <span className="ct-field__label">
          {label}
          {required && <span className="ct-required-indicator" aria-label="required"> *</span>}
        </span>
      ) : null}
      <input 
        id={inputId} 
        className={cn('ct-input', error && 'ct-input--error')} 
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : hintId}
        required={required}
        {...props} 
      />
      {error ? <span className="ct-field__error" id={errorId} role="alert">{error}</span> : null}
      {!error && hint ? <span className="ct-field__hint" id={hintId}>{hint}</span> : null}
    </label>
  );
}

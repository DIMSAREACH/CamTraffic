import type { InputHTMLAttributes } from 'react';
import { cn } from '@camtraffic/utils';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Checkbox({ label, error, hint, className, id, ...props }: CheckboxProps) {
  const checkboxId = id ?? props.name;

  return (
    <div className={cn('ct-field', className)}>
      <label className="ct-checkbox" htmlFor={checkboxId}>
        <input
          type="checkbox"
          id={checkboxId}
          className={cn('ct-checkbox__input', error && 'ct-checkbox__input--error')}
          {...props}
        />
        {label ? <span className="ct-checkbox__label">{label}</span> : null}
      </label>
      {error ? <span className="ct-field__error">{error}</span> : null}
      {!error && hint ? <span className="ct-field__hint">{hint}</span> : null}
    </div>
  );
}

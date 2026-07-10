import type { InputHTMLAttributes } from 'react';
import { cn } from '@camtraffic/utils';

export interface DatePickerProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  hint?: string;
}

export function DatePicker({ label, error, hint, className, id, ...props }: DatePickerProps) {
  const dateId = id ?? props.name;

  return (
    <label className={cn('ct-field', className)} htmlFor={dateId}>
      {label ? <span className="ct-field__label">{label}</span> : null}
      <input
        type="date"
        id={dateId}
        className={cn('ct-input', 'ct-date-picker', error && 'ct-input--error')}
        {...props}
      />
      {error ? <span className="ct-field__error">{error}</span> : null}
      {!error && hint ? <span className="ct-field__hint">{hint}</span> : null}
    </label>
  );
}

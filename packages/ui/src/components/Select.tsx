import type { SelectHTMLAttributes } from 'react';
import { cn } from '@camtraffic/utils';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
}

export function Select({
  label,
  error,
  hint,
  options,
  placeholder,
  className,
  id,
  ...props
}: SelectProps) {
  const selectId = id ?? props.name;

  return (
    <label className={cn('ct-field', className)} htmlFor={selectId}>
      {label ? <span className="ct-field__label">{label}</span> : null}
      <select id={selectId} className={cn('ct-select', error && 'ct-select--error')} {...props}>
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <span className="ct-field__error">{error}</span> : null}
      {!error && hint ? <span className="ct-field__hint">{hint}</span> : null}
    </label>
  );
}

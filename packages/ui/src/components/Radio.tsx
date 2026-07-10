import type { InputHTMLAttributes } from 'react';
import { cn } from '@camtraffic/utils';

export interface RadioOption {
  value: string;
  label: string;
}

export interface RadioGroupProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  label?: string;
  error?: string;
  hint?: string;
  options: RadioOption[];
  name: string;
  value?: string;
  onChange?: (value: string) => void;
}

export function RadioGroup({
  label,
  error,
  hint,
  options,
  name,
  value,
  onChange,
  className,
  ...props
}: RadioGroupProps) {
  return (
    <div className={cn('ct-field', className)}>
      {label ? <span className="ct-field__label">{label}</span> : null}
      <div className="ct-radio-group">
        {options.map((option) => (
          <label key={option.value} className="ct-radio" htmlFor={`${name}-${option.value}`}>
            <input
              type="radio"
              id={`${name}-${option.value}`}
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={(e) => onChange?.(e.target.value)}
              className={cn('ct-radio__input', error && 'ct-radio__input--error')}
              {...props}
            />
            <span className="ct-radio__label">{option.label}</span>
          </label>
        ))}
      </div>
      {error ? <span className="ct-field__error">{error}</span> : null}
      {!error && hint ? <span className="ct-field__hint">{hint}</span> : null}
    </div>
  );
}

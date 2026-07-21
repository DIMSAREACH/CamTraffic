import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shared/components/ui/select';
import { cn } from '@shared/components/ui/utils';

export type FilterSelectOption = {
  value: string;
  label: string;
};

type FilterSelectTone = 'default' | 'blue' | 'teal' | 'purple' | 'rose' | 'amber';

type FilterSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: FilterSelectOption[];
  ariaLabel?: string;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  tone?: FilterSelectTone;
  size?: 'sm' | 'default';
  disabled?: boolean;
};

/**
 * Styled Radix select for toolbars/filters — same polished menu as
 * AI Detection “Auto (match sign rule)” instead of OS-native dropdowns.
 */
export function FilterSelect({
  value,
  onValueChange,
  options,
  ariaLabel,
  placeholder,
  className,
  triggerClassName,
  contentClassName,
  tone = 'default',
  size = 'default',
  disabled = false,
}: FilterSelectProps) {
  return (
    <div className={cn('ct-filter-select', `ct-filter-select--${tone}`, className)}>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger
          size={size}
          aria-label={ariaLabel}
          className={cn('ct-filter-select__trigger', triggerClassName)}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className={cn('ct-filter-select__menu', contentClassName)}>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="ct-filter-select__item">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

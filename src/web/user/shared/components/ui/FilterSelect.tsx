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
  /** Full-width trigger for forms / dialogs */
  block?: boolean;
};

const EMPTY = '__empty';

/**
 * Styled Radix select for toolbars/filters/forms — polished menu instead of OS-native dropdowns.
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
  block = false,
}: FilterSelectProps) {
  const selectValue = value || EMPTY;

  return (
    <div
      className={cn(
        'ct-filter-select',
        `ct-filter-select--${tone}`,
        block && 'ct-filter-select--block',
        className,
      )}
    >
      <Select
        value={selectValue}
        onValueChange={(next) => onValueChange(next === EMPTY ? '' : next)}
        disabled={disabled}
      >
        <SelectTrigger
          size={size}
          aria-label={ariaLabel}
          className={cn('ct-filter-select__trigger', triggerClassName)}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className={cn('ct-filter-select__menu', contentClassName)}>
          {options.map((opt) => {
            const itemValue = opt.value || EMPTY;
            return (
              <SelectItem
                key={itemValue}
                value={itemValue}
                className="ct-filter-select__item"
              >
                {opt.label}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}

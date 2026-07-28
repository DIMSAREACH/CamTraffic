import { useMemo } from 'react';
import { useLanguage } from '@shared/context/LanguageContext';
import { OBSERVED_ACTION_VALUES } from '@shared/constants/observedActions';
import { FilterSelect } from '@shared/components/ui/FilterSelect';
import { Label } from '@shared/components/ui/label';

const AUTO_VALUE = '_auto';

interface DemoObservedActionSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Default = Auto: backend matches the detected sign to its violation rule
 * (e.g. No Entry → ENTER) and can create the violation without a manual pick.
 * Officers may still override with an explicit action.
 */
export function DemoObservedActionSelect({
  value,
  onChange,
  disabled = false,
  className = '',
}: DemoObservedActionSelectProps) {
  const { t } = useLanguage();

  const options = useMemo(() => {
    const labelFor = (action: string) => {
      const key = `violations.actions.${action}`;
      const translated = t(key);
      return translated !== key ? translated : action.replace(/_/g, ' ');
    };
    const autoLabel =
      t('aiDetection.demoActionAuto') !== 'aiDetection.demoActionAuto'
        ? t('aiDetection.demoActionAuto')
        : 'Auto (match from detected sign)';
    return [
      { value: AUTO_VALUE, label: autoLabel },
      ...OBSERVED_ACTION_VALUES.map((action) => ({
        value: action,
        label: labelFor(action),
      })),
    ];
  }, [t]);

  const selectValue = value || AUTO_VALUE;

  return (
    <div className={`ai-detection-demo-select${className ? ` ${className}` : ''}`}>
      <Label className="ai-detection-demo-select__label">
        {t('aiDetection.demoActionLabel') !== 'aiDetection.demoActionLabel'
          ? t('aiDetection.demoActionLabel')
          : 'Driver action'}
      </Label>
      <FilterSelect
        value={selectValue}
        onValueChange={(next) => {
          if (next === AUTO_VALUE) onChange('');
          else onChange(next);
        }}
        options={options}
        disabled={disabled}
        tone="purple"
        ariaLabel={t('aiDetection.demoActionLabel')}
        placeholder={
          t('aiDetection.demoActionAuto') !== 'aiDetection.demoActionAuto'
            ? t('aiDetection.demoActionAuto')
            : 'Auto (match from detected sign)'
        }
        triggerClassName="ai-detection-demo-select__trigger"
        contentClassName="ai-detection-demo-select__menu"
      />
      <p className="ai-detection-demo-select__hint">
        {t('aiDetection.demoActionHint') !== 'aiDetection.demoActionHint'
          ? t('aiDetection.demoActionHint')
          : 'Auto matches the sign to a rule (e.g. No Entry → ENTER) and creates a violation when possible. Override only if needed.'}
      </p>
    </div>
  );
}

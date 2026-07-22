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
    return [
      { value: AUTO_VALUE, label: t('aiDetection.demoActionAuto') },
      ...OBSERVED_ACTION_VALUES.map((action) => ({
        value: action,
        label: labelFor(action),
      })),
    ];
  }, [t]);

  return (
    <div className={`ai-detection-demo-select${className ? ` ${className}` : ''}`}>
      <Label className="ai-detection-demo-select__label">{t('aiDetection.demoActionLabel')}</Label>
      <FilterSelect
        value={value || AUTO_VALUE}
        onValueChange={(next) => onChange(next === AUTO_VALUE ? '' : next)}
        options={options}
        disabled={disabled}
        tone="purple"
        ariaLabel={t('aiDetection.demoActionLabel')}
        placeholder={t('aiDetection.demoActionAuto')}
        triggerClassName="ai-detection-demo-select__trigger"
        contentClassName="ai-detection-demo-select__menu"
      />
      <p className="ai-detection-demo-select__hint">{t('aiDetection.demoActionHint')}</p>
    </div>
  );
}

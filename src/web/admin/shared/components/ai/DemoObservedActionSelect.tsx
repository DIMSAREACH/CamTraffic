import { useMemo } from 'react';
import { useLanguage } from '@shared/context/LanguageContext';
import { OBSERVED_ACTION_VALUES } from '@shared/constants/observedActions';
import { ALLOW_DEMO_VIOLATION } from '@shared/config/dataMode';
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
 * Always visible for officers/admins creating violations.
 * "Auto" (demo inference) only when VITE_ALLOW_DEMO_VIOLATION=true.
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
    const rows = OBSERVED_ACTION_VALUES.map((action) => ({
      value: action,
      label: labelFor(action),
    }));
    if (ALLOW_DEMO_VIOLATION) {
      return [
        { value: AUTO_VALUE, label: t('aiDetection.demoActionAuto') },
        ...rows,
      ];
    }
    return [
      { value: '', label: t('aiDetection.selectObservedAction') !== 'aiDetection.selectObservedAction'
        ? t('aiDetection.selectObservedAction')
        : 'Select observed action…' },
      ...rows,
    ];
  }, [t]);

  const selectValue = ALLOW_DEMO_VIOLATION
    ? (value || AUTO_VALUE)
    : (value || '');

  return (
    <div className={`ai-detection-demo-select${className ? ` ${className}` : ''}`}>
      <Label className="ai-detection-demo-select__label">
        {t('aiDetection.demoActionLabel') !== 'aiDetection.demoActionLabel'
          ? t('aiDetection.demoActionLabel')
          : 'Observed action'}
      </Label>
      <FilterSelect
        value={selectValue}
        onValueChange={(next) => {
          if (ALLOW_DEMO_VIOLATION && next === AUTO_VALUE) onChange('');
          else onChange(next);
        }}
        options={options}
        disabled={disabled}
        tone="purple"
        ariaLabel={t('aiDetection.demoActionLabel')}
        placeholder={ALLOW_DEMO_VIOLATION
          ? t('aiDetection.demoActionAuto')
          : 'Select observed action…'}
        triggerClassName="ai-detection-demo-select__trigger"
        contentClassName="ai-detection-demo-select__menu"
      />
      <p className="ai-detection-demo-select__hint">
        {ALLOW_DEMO_VIOLATION
          ? t('aiDetection.demoActionHint')
          : 'Required to create a violation — pick the real driver action (e.g. ENTER for No Entry).'}
      </p>
    </div>
  );
}

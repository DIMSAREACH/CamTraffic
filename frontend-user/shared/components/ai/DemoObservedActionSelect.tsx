import { useLanguage } from '@shared/context/LanguageContext';
import { OBSERVED_ACTION_VALUES } from '@shared/constants/observedActions';
import { Label } from '@shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';

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

  const labelFor = (action: string) => {
    const key = `violations.actions.${action}`;
    const translated = t(key);
    return translated !== key ? translated : action.replace(/_/g, ' ');
  };

  return (
    <div className={`ai-detection-demo-select${className ? ` ${className}` : ''}`}>
      <Label className="ai-detection-demo-select__label">{t('aiDetection.demoActionLabel')}</Label>
      <Select
        value={value || AUTO_VALUE}
        disabled={disabled}
        onValueChange={(next) => onChange(next === AUTO_VALUE ? '' : next)}
      >
        <SelectTrigger className="ai-detection-demo-select__trigger">
          <SelectValue placeholder={t('aiDetection.demoActionAuto')} />
        </SelectTrigger>
        <SelectContent className="ai-detection-demo-select__menu">
          <SelectItem value={AUTO_VALUE} className="ai-detection-demo-select__item">
            {t('aiDetection.demoActionAuto')}
          </SelectItem>
          {OBSERVED_ACTION_VALUES.map((action) => (
            <SelectItem key={action} value={action} className="ai-detection-demo-select__item">
              {labelFor(action)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="ai-detection-demo-select__hint">{t('aiDetection.demoActionHint')}</p>
    </div>
  );
}

import { useLanguage } from '@shared/context/LanguageContext';
import { OBSERVED_ACTION_VALUES } from '@shared/constants/observedActions';

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
    <div className={className}>
      <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
        {t('aiDetection.demoActionLabel')}
      </label>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-[13px] font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40 disabled:opacity-60"
      >
        <option value="">{t('aiDetection.demoActionAuto')}</option>
        {OBSERVED_ACTION_VALUES.map((action) => (
          <option key={action} value={action}>
            {labelFor(action)}
          </option>
        ))}
      </select>
      <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
        {t('aiDetection.demoActionHint')}
      </p>
    </div>
  );
}

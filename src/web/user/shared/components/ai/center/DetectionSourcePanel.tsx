import { Upload, Film, Cctv, Camera, Radio, ArrowRight, Sparkles, Zap, Eye, Video } from 'lucide-react';
import { useLanguage } from '@shared/context/LanguageContext';
import { cn } from '@shared/components/ui/utils';
import type { EnterpriseInputMode } from '@shared/components/ai/center/EnterpriseDetectionInputWorkspace';

const INPUT_MODES: { 
  id: EnterpriseInputMode; 
  icon: typeof Upload; 
  tone: string;
  gradient: string;
  iconBg: string;
  hoverScale: string;
}[] = [
  { 
    id: 'image', 
    icon: Upload, 
    tone: 'violet',
    gradient: 'from-violet-500 to-purple-600',
    iconBg: 'bg-violet-100 dark:bg-violet-900/30',
    hoverScale: 'hover:scale-105'
  },
  { 
    id: 'video', 
    icon: Film, 
    tone: 'blue',
    gradient: 'from-blue-500 to-indigo-600',
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    hoverScale: 'hover:scale-105'
  },
  { 
    id: 'webcam', 
    icon: Camera, 
    tone: 'emerald',
    gradient: 'from-emerald-500 to-green-600',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
    hoverScale: 'hover:scale-105'
  },
  { 
    id: 'camera', 
    icon: Cctv, 
    tone: 'cyan',
    gradient: 'from-cyan-500 to-teal-600',
    iconBg: 'bg-cyan-100 dark:bg-cyan-900/30',
    hoverScale: 'hover:scale-105'
  },
];

interface DetectionSourcePanelProps {
  selectedMode: EnterpriseInputMode;
  onSelect: (mode: EnterpriseInputMode) => void;
  disabled?: boolean;
  className?: string;
  /** inline = segmented bar in workspace; page = card grid */
  variant?: 'page' | 'inline';
}

export function DetectionSourcePanel({
  selectedMode,
  onSelect,
  disabled = false,
  className,
  variant = 'page',
}: DetectionSourcePanelProps) {
  const { t } = useLanguage();
  const isInline = variant === 'inline';

  if (isInline) {
    return (
      <div
        className={cn('ai-mode-switch', className)}
        role="tablist"
        aria-label={t('aiCenter.detectionSource')}
      >
        {INPUT_MODES.map(({ id, icon: Icon, tone }) => {
          const active = selectedMode === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              disabled={disabled}
              onClick={() => onSelect(id)}
              className={cn(
                'ai-mode-switch__tab',
                `ai-mode-switch__tab--${tone}`,
                active && 'is-active',
                disabled && 'is-disabled',
              )}
            >
              <Icon size={18} strokeWidth={2.1} aria-hidden />
              <span className="ai-mode-switch__copy">
                <span className="ai-mode-switch__label">{t(`aiCenter.input.${id}`)}</span>
                <span className="ai-mode-switch__desc">{t(`aiCenter.sourceDesc.${id}`)}</span>
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn('enterprise-ai-source-page', 'enforcement-page__panel', className)}>
      <header className="enterprise-ai-workspace__source-head enterprise-ai-workspace__source-head--source mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="enterprise-ai-workspace__head-copy flex-1">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-purple-400">
              {t('aiCenter.detectionSource')}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 font-medium">
              {t('aiCenter.panelInputHint')}
            </p>
          </div>
          <div className="enterprise-ai-workspace__head-icon enterprise-ai-workspace__head-icon--source">
            <Radio size={20} className="text-blue-500" />
          </div>
        </div>
      </header>

      <div
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
        role="radiogroup"
        aria-label={t('aiCenter.detectionSource')}
      >
        {INPUT_MODES.map(({ id, icon: Icon, tone, gradient, iconBg, hoverScale }) => {
          const active = selectedMode === id;
          return (
            <button
              key={id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(id)}
              className={cn(
                'group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 text-left w-full',
                active 
                  ? `border-${tone}-500 bg-gradient-to-br ${gradient} shadow-2xl shadow-${tone}-500/40` 
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-${tone}-400 hover:shadow-xl',
                disabled && 'opacity-50 cursor-not-allowed',
                !disabled && hoverScale
              )}
            >
              {/* Content Container */}
              <div className={cn(
                'p-6 flex items-start gap-4',
                active ? 'text-white' : 'text-slate-700 dark:text-slate-300'
              )}>
                {/* Icon */}
                <div className={cn(
                  'p-4 rounded-xl transition-transform group-hover:scale-110 shrink-0',
                  active ? 'bg-white/20 backdrop-blur-sm' : iconBg
                )}>
                  <Icon size={40} strokeWidth={2.5} className={cn(
                    'transition-all',
                    active ? 'text-white drop-shadow-lg' : `text-${tone}-600 dark:text-${tone}-400`
                  )} />
                </div>
                
                {/* Text Content */}
                <div className="flex-1 min-w-0">
                  <h3 className={cn(
                    'text-xl font-bold mb-2 tracking-tight',
                    active ? 'text-white drop-shadow-md' : 'text-slate-900 dark:text-white'
                  )}>
                    {t(`aiCenter.input.${id}`)}
                  </h3>
                  <p className={cn(
                    'text-sm leading-relaxed font-medium',
                    active ? 'text-white/95' : 'text-slate-600 dark:text-slate-400'
                  )}>
                    {t(`aiCenter.sourceDesc.${id}`)}
                  </p>
                </div>
                
                {/* Arrow Indicator */}
                <div className={cn(
                  'transition-all shrink-0',
                  active ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'
                )}>
                  <ArrowRight
                    size={28}
                    strokeWidth={2.5}
                    className={active ? 'text-white drop-shadow-lg' : `text-${tone}-500`}
                  />
                </div>
              </div>
              
              {/* Active Indicator Badge */}
              {active && (
                <div className="absolute top-4 right-4">
                  <div className="bg-white/25 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-lg">
                    <Zap size={16} className="text-white" fill="white" />
                    <span className="text-xs font-bold text-white uppercase tracking-wide">Active</span>
                  </div>
                </div>
              )}
              
              {/* Gradient Overlay for hover effect */}
              {!active && (
                <div className={cn(
                  'absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none',
                  gradient
                )} />
              )}
              
              {/* Shine effect on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

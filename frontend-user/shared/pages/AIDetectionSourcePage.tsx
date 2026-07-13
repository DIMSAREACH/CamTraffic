import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Camera, Upload, ArrowRight, Brain } from 'lucide-react';
import {
  getStoredUserDetectionInputMode,
  setStoredUserDetectionInputMode,
  type UserDetectionInputMode,
} from '@shared/constants/detectionInputMode';
import { USER_PORTAL_ROUTES } from '@shared/constants/userPortalPaths';
import { useLanguage } from '@shared/context/LanguageContext';
import { cn } from '@shared/components/ui/utils';

const SOURCE_OPTIONS: {
  id: UserDetectionInputMode;
  icon: typeof Upload;
  tone: string;
  labelKey: string;
  descKey: string;
}[] = [
  {
    id: 'upload',
    icon: Upload,
    tone: 'violet',
    labelKey: 'aiDetection.tabUploadFile',
    descKey: 'aiDetection.sourceDesc.upload',
  },
  {
    id: 'webcam',
    icon: Camera,
    tone: 'emerald',
    labelKey: 'aiDetection.tabLiveWebcam',
    descKey: 'aiDetection.sourceDesc.webcam',
  },
];

export function AIDetectionSourcePage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [selectedMode, setSelectedMode] = useState<UserDetectionInputMode>(getStoredUserDetectionInputMode);

  const handleSelect = (mode: UserDetectionInputMode) => {
    setSelectedMode(mode);
    setStoredUserDetectionInputMode(mode);
    navigate(USER_PORTAL_ROUTES.aiDetection);
  };

  return (
    <div className="dashboard-home dashboard-page--ai ai-detection-page w-full min-h-full space-y-5">
      <div className="ai-detection-page-hero ai-detection-page-hero--banner rounded-2xl border shadow-lg overflow-hidden">
        <div className="ai-detection-panel-header ai-detection-panel-header--gradient ai-detection-panel-header--hero p-5 sm:p-6">
          <div className="ai-detection-panel-header__row">
            <div className="ai-detection-panel-header__icon">
              <Brain size={18} className="ai-detection-panel-header__icon-svg" />
            </div>
            <div>
              <p className="ai-detection-panel-header__eyebrow">{t('aiDetection.heroEyebrow')}</p>
              <h1 className="ai-detection-panel-header__title">{t('aiDetection.detectionSourceTitle')}</h1>
              <p className="ai-detection-panel-header__subtitle">{t('aiDetection.detectionSourceHint')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
        {SOURCE_OPTIONS.map(({ id, icon: Icon, tone, labelKey, descKey }) => {
          const active = selectedMode === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => handleSelect(id)}
              className={cn(
                'ai-detection-source-card rounded-2xl border p-5 text-left transition-all',
                `ai-detection-source-card--${tone}`,
                active && 'is-active',
              )}
            >
              <div className="flex items-start gap-3">
                <div className="ai-detection-source-card__icon">
                  <Icon size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[15px]">{t(labelKey)}</p>
                  <p className="text-sm text-muted-foreground mt-1">{t(descKey)}</p>
                  {active && (
                    <span className="inline-flex items-center gap-1 mt-3 text-xs font-bold text-violet-600">
                      {t('aiDetection.openLiveDetection')}
                      <ArrowRight size={14} />
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

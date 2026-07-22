import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Brain } from 'lucide-react';
import { DetectionSourcePanel } from '@shared/components/ai/center/DetectionSourcePanel';
import type { EnterpriseInputMode } from '@shared/components/ai/center/EnterpriseDetectionInputWorkspace';
import {
  getStoredUserDetectionInputMode,
  setStoredUserDetectionInputMode,
} from '@shared/constants/detectionInputMode';
import { USER_PORTAL_ROUTES } from '@shared/constants/userPortalPaths';
import { useLanguage } from '@shared/context/LanguageContext';

export function AIDetectionSourcePage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [selectedMode, setSelectedMode] = useState<EnterpriseInputMode>(getStoredUserDetectionInputMode);

  const handleSelect = (mode: EnterpriseInputMode) => {
    setSelectedMode(mode);
    setStoredUserDetectionInputMode(mode);
    navigate(USER_PORTAL_ROUTES.aiDetectionNew);
  };

  return (
    <div className="enforcement-page enforcement-page--ai-center dashboard-home dashboard-page--ai-center enterprise-ai-page">
      <div className="enforcement-page__hero enterprise-ai-page__hero enterprise-ai-page__hero--compact">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-inner enterprise-ai-page__hero-inner">
          <div>
            <div className="enforcement-page__eyebrow">
              <span className="enforcement-page__eyebrow-icon">
                <Brain size={14} />
              </span>
              {t('aiCenter.heroEyebrow')}
            </div>
            <h1 className="enforcement-page__title">{t('aiCenter.detectionSource')}</h1>
            <p className="enforcement-page__subtitle">{t('aiCenter.detectionSourcePageHint')}</p>
          </div>
        </div>
      </div>

      <DetectionSourcePanel selectedMode={selectedMode} onSelect={handleSelect} />
    </div>
  );
}

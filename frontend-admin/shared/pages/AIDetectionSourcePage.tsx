import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Brain } from 'lucide-react';
import { DetectionSourcePanel } from '@shared/components/ai/center/DetectionSourcePanel';
import type { EnterpriseInputMode } from '@shared/components/ai/center/EnterpriseDetectionInputWorkspace';
import {
  getStoredAdminDetectionInputMode,
  setStoredAdminDetectionInputMode,
} from '@shared/constants/detectionInputMode';
import { useLanguage } from '@shared/context/LanguageContext';

const LIVE_PATH = '/admin/ai-detection/new';

export function AIDetectionSourcePage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [selectedMode, setSelectedMode] = useState<EnterpriseInputMode>(getStoredAdminDetectionInputMode);

  const handleSelect = (mode: EnterpriseInputMode) => {
    setSelectedMode(mode);
    setStoredAdminDetectionInputMode(mode);
    navigate(LIVE_PATH);
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

import { useMemo } from 'react';
import {
  Upload, Signpost, Activity, ScanLine, Shield, FileText, Database, LayoutDashboard,
} from 'lucide-react';
import { useLanguage } from '@shared/context/LanguageContext';
import type { AIDetectionPageStats } from '@shared/types';

export function modelStatusLabel(
  mode: AIDetectionPageStats['model']['mode'],
  t: (key: string) => string,
) {
  if (mode === 'local' || mode === 'yolo' || mode === 'hybrid') {
    const label = mode === 'hybrid'
      ? t('aiDetection.modelHybrid')
      : mode === 'local'
        ? t('aiDetection.modelLocal')
        : t('aiDetection.modelLive');
    return {
      text: label,
      color: '#34D399',
      bg: 'rgba(52,211,153,0.12)',
      border: 'rgba(52,211,153,0.25)',
    };
  }
  if (mode === 'mock_fallback') {
    return { text: t('aiDetection.modelWeightsMissing'), color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' };
  }
  return { text: t('aiDetection.modelDemo'), color: '#FFFFFF', dot: '#FBBF24', bg: 'rgba(255,255,255,0.16)', border: 'rgba(255,255,255,0.32)' };
}

export function useAIDetectionCopy() {
  const { t, locale } = useLanguage();

  return useMemo(() => {
    const STEPS = [
      { n: '01', title: t('aiDetection.flow.input'), desc: t('aiDetection.steps.uploadDesc'), color: '#06B6D4', icon: Upload },
      { n: '02', title: t('aiDetection.flow.signDetect'), desc: t('aiDetection.steps.inferenceDesc'), color: '#8B5CF6', icon: Signpost },
      { n: '03', title: t('aiDetection.flow.vehicleTrack'), desc: t('aiDetection.steps.preprocessDesc'), color: '#6366F1', icon: Activity },
      { n: '04', title: t('aiDetection.flow.ocr'), desc: t('aiDetection.pipeline.plateOcr'), color: '#A855F7', icon: ScanLine },
      { n: '05', title: t('aiDetection.flow.ruleEngine'), desc: t('aiDetection.violationTitle'), color: '#F59E0B', icon: Shield },
      { n: '06', title: t('aiDetection.flow.evidence'), desc: t('aiDetection.vehicleEvidence'), color: '#F97316', icon: FileText },
      { n: '07', title: t('aiDetection.flow.database'), desc: t('aiDetection.pipeline.saveRecord'), color: '#10B981', icon: Database },
      { n: '08', title: t('aiDetection.flow.dashboard'), desc: t('aiDetection.steps.resultsDesc'), color: '#0EA5E9', icon: LayoutDashboard },
    ];

    const AWAIT_STEPS = STEPS.slice(0, 3).map((s) => ({
      icon: s.icon,
      label: s.title,
      desc: s.desc,
      color: s.color,
    }));

    const formatTraining = (n: number) => {
      if (n <= 0) return null;
      if (n >= 1000) return t('aiDetection.trainingImages').replace('{count}', `${(n / 1000).toFixed(1)}K+`);
      return t('aiDetection.trainingImages').replace('{count}', String(n));
    };

    const categoryName = (key: string, fallback: string) => {
      if (locale !== 'km') return fallback;
      return t(`signCategories.${key}`) || fallback;
    };

    return {
      t,
      locale,
      STEPS,
      AWAIT_STEPS,
      formatTraining,
      categoryName,
      modelStatus: (mode: AIDetectionPageStats['model']['mode']) => modelStatusLabel(mode, t),
    };
  }, [t, locale]);
}

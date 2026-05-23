import { useMemo } from 'react';
import { Upload, Zap, CheckCircle } from 'lucide-react';
import { useLanguage } from '@shared/context/LanguageContext';
import type { AIDetectionPageStats } from '@shared/types';

export function modelStatusLabel(
  mode: AIDetectionPageStats['model']['mode'],
  t: (key: string) => string,
) {
  if (mode === 'yolo') {
    return { text: t('aiDetection.modelLive'), color: '#34D399', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.25)' };
  }
  if (mode === 'mock_fallback') {
    return { text: t('aiDetection.modelWeightsMissing'), color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' };
  }
  return { text: t('aiDetection.modelDemo'), color: '#A78BFA', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.25)' };
}

export function useAIDetectionCopy() {
  const { t } = useLanguage();

  return useMemo(() => {
    const STEPS = [
      { n: '01', title: t('aiDetection.steps.upload'), desc: t('aiDetection.steps.uploadDesc'), color: '#3B82F6' },
      { n: '02', title: t('aiDetection.steps.preprocess'), desc: t('aiDetection.steps.preprocessDesc'), color: '#06B6D4' },
      { n: '03', title: t('aiDetection.steps.inference'), desc: t('aiDetection.steps.inferenceDesc'), color: '#8B5CF6' },
      { n: '04', title: t('aiDetection.steps.results'), desc: t('aiDetection.steps.resultsDesc'), color: '#10B981' },
    ];

    const AWAIT_STEPS = [
      { icon: Upload, label: t('aiDetection.awaitSteps.upload'), desc: t('aiDetection.awaitSteps.uploadDesc'), color: '#8B5CF6' },
      { icon: Zap, label: t('aiDetection.awaitSteps.analyse'), desc: t('aiDetection.awaitSteps.analyseDesc'), color: '#06B6D4' },
      { icon: CheckCircle, label: t('aiDetection.awaitSteps.results'), desc: t('aiDetection.awaitSteps.resultsDesc'), color: '#10B981' },
    ];

    const formatTraining = (n: number) => {
      if (n <= 0) return null;
      if (n >= 1000) return t('aiDetection.trainingImages').replace('{count}', `${(n / 1000).toFixed(1)}K+`);
      return t('aiDetection.trainingImages').replace('{count}', String(n));
    };

    return {
      t,
      STEPS,
      AWAIT_STEPS,
      formatTraining,
      modelStatus: (mode: AIDetectionPageStats['model']['mode']) => modelStatusLabel(mode, t),
    };
  }, [t]);
}

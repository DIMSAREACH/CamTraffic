import { useEffect, useState } from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useLanguage } from '@shared/context/LanguageContext';
import { cn } from '@shared/components/ui/utils';

interface DetectionStep {
  id: string;
  label: string;
  completed: boolean;
}

interface DetectionProcessOverlayProps {
  show: boolean;
  progress?: number;
  statusText?: string;
}

export function DetectionProcessOverlay({
  show,
  progress = 0,
  statusText = 'Analyzing Image...',
}: DetectionProcessOverlayProps) {
  const { t } = useLanguage();
  const [displayProgress, setDisplayProgress] = useState(0);
  const [steps, setSteps] = useState<DetectionStep[]>([
    { id: 'signs', label: t('aiCenter.detectingSigns') || 'Detecting Traffic Signs', completed: false },
    { id: 'vehicles', label: t('aiCenter.detectingVehicles') || 'Detecting Vehicles', completed: false },
    { id: 'violations', label: t('aiCenter.checkingViolations') || 'Checking Traffic Violation', completed: false },
  ]);

  // Smooth catch-up toward target (no +1 every 20ms lag)
  useEffect(() => {
    if (!show) {
      setDisplayProgress(0);
      return;
    }
    let frame = 0;
    let current = 0;
    setDisplayProgress((prev) => {
      current = prev;
      return prev;
    });
    const tick = () => {
      if (current >= progress) return;
      const delta = Math.max(1, Math.ceil((progress - current) * 0.28));
      current = Math.min(progress, current + delta);
      setDisplayProgress(current);
      if (current < progress) {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [progress, show]);

  useEffect(() => {
    setSteps((prev) =>
      prev.map((step, idx) => ({
        ...step,
        completed: displayProgress >= (idx + 1) * 28 || displayProgress >= 99,
      })),
    );
  }, [displayProgress]);

  if (!show) return null;

  return (
    <div className="detection-process-overlay">
      <div className="detection-process-card">
        <div className="detection-process-spinner">
          <Loader2 size={48} className="animate-spin" />
        </div>

        <h2 className="detection-process-title">
          {t('aiCenter.aiDetection') || 'AI Detection'}
        </h2>

        <p className="detection-process-status">{statusText}</p>

        <div className="detection-progress-container">
          <div className="detection-progress-bar">
            <div
              className="detection-progress-fill"
              style={{ width: `${displayProgress}%` }}
            />
          </div>
          <div className="detection-progress-percent">{displayProgress}%</div>
        </div>

        <div className="detection-steps">
          {steps.map((step) => (
            <div
              key={step.id}
              className={cn(
                'detection-step',
                step.completed && 'detection-step--completed',
              )}
            >
              <CheckCircle
                size={20}
                className={cn(
                  'detection-step-icon',
                  step.completed && 'detection-step-icon--completed',
                )}
              />
              <span className="detection-step-label">{step.label}</span>
            </div>
          ))}
        </div>

        <p className="detection-process-wait">
          {t('aiCenter.pleaseWait') || 'Please wait...'}
        </p>
      </div>
    </div>
  );
}

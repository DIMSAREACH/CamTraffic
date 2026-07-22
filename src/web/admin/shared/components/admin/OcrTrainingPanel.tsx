import { useCallback, useEffect, useState } from 'react';
import {
  BookOpen, FlaskConical, Play, RefreshCw, ScanText, Target,
} from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/components/ui/table';
import { useLanguage } from '@shared/context/LanguageContext';
import { ocrTrainingAPI } from '@shared/services/api';
import { toast } from 'sonner';

type OcrStatus = {
  manifest?: {
    exists: boolean;
    samples: number;
    crop_files: number;
    manifest_path?: string;
    preview?: Array<{ crop_path: string; transcription: string }>;
  };
  baseline?: {
    cer?: number | null;
    exact_match_rate?: number | null;
    samples?: number;
    evaluated_at?: string;
    engine?: string;
  } | null;
  improved?: {
    cer?: number | null;
    exact_match_rate?: number | null;
  } | null;
  scripts?: Record<string, string>;
};

export function OcrTrainingPanel() {
  const { t } = useLanguage();
  const tr = (key: string, fb: string) => {
    const v = t(key);
    return v !== key ? v : fb;
  };

  const [status, setStatus] = useState<OcrStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [sampleLimit, setSampleLimit] = useState('50');
  const [lastOutput, setLastOutput] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setStatus(await ocrTrainingAPI.getStatus() as OcrStatus);
    } catch {
      toast.error(tr('ocrTraining.loadFailed', 'Failed to load OCR training status'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { void load(); }, [load]);

  const runAction = async (
    key: string,
    fn: () => Promise<{ output?: string; report?: OcrStatus['baseline']; status?: OcrStatus }>,
    successMsg: string,
  ) => {
    setRunning(key);
    setLastOutput('');
    try {
      const res = await fn();
      if (res.status) setStatus(res.status);
      if (res.report) {
        setStatus((prev) => ({ ...prev, baseline: res.report }));
      }
      if (res.output) setLastOutput(res.output);
      toast.success(successMsg);
    } catch {
      toast.error(tr('ocrTraining.runFailed', 'Training action failed'));
    } finally {
      setRunning(null);
    }
  };

  const baseline = status?.baseline;
  const manifest = status?.manifest;

  return (
    <section className="ai-train-panel" aria-labelledby="ocr-training-title">
      <header className="ai-train-panel__head ai-train-panel__head--ocr">
        <span className="ai-train-panel__glow" aria-hidden />
        <div className="ai-train-panel__icon"><ScanText size={18} /></div>
        <div className="ai-train-panel__copy">
          <h2 id="ocr-training-title" className="ai-train-panel__title">
            {tr('ocrTraining.title', 'OCR model training')}
          </h2>
          <p className="ai-train-panel__sub">
            {tr('ocrTraining.subtitle', 'Evaluate EasyOCR on Cambodian plate crops, check prerequisites, and run edge-case tests.')}
          </p>
        </div>
      </header>

      <div className="ai-train-panel__body">
        <div className="enforcement-page__stat-grid enforcement-page__stat-grid--four ai-train-ocr__stats">
          <div className="enforcement-page__stat-card enforcement-page__stat-card--teal">
            <div className="enforcement-page__stat-icon enforcement-page__stat-icon--teal"><ScanText size={18} /></div>
            <div className="enforcement-page__stat-copy">
              <p className="enforcement-page__stat-value">{manifest?.samples ?? 0}</p>
              <p className="enforcement-page__stat-label enforcement-page__stat-label--teal">
                {tr('ocrTraining.manifestSamples', 'Manifest samples')}
              </p>
            </div>
          </div>
          <div className="enforcement-page__stat-card enforcement-page__stat-card--blue">
            <div className="enforcement-page__stat-icon enforcement-page__stat-icon--blue"><Target size={18} /></div>
            <div className="enforcement-page__stat-copy">
              <p className="enforcement-page__stat-value">
                {baseline?.cer != null ? baseline.cer.toFixed(3) : '—'}
              </p>
              <p className="enforcement-page__stat-label enforcement-page__stat-label--blue">
                {tr('ocrTraining.cer', 'CER (baseline)')}
              </p>
            </div>
          </div>
          <div className="enforcement-page__stat-card enforcement-page__stat-card--emerald">
            <div className="enforcement-page__stat-icon enforcement-page__stat-icon--emerald"><Play size={18} /></div>
            <div className="enforcement-page__stat-copy">
              <p className="enforcement-page__stat-value">
                {baseline?.exact_match_rate != null
                  ? `${Math.round(baseline.exact_match_rate * 100)}%`
                  : '—'}
              </p>
              <p className="enforcement-page__stat-label enforcement-page__stat-label--emerald">
                {tr('ocrTraining.exactMatch', 'Exact match')}
              </p>
            </div>
          </div>
          <div className="enforcement-page__stat-card enforcement-page__stat-card--violet">
            <div className="enforcement-page__stat-icon enforcement-page__stat-icon--violet"><FlaskConical size={18} /></div>
            <div className="enforcement-page__stat-copy">
              <p className="enforcement-page__stat-value">{manifest?.crop_files ?? 0}</p>
              <p className="enforcement-page__stat-label enforcement-page__stat-label--violet">
                {tr('ocrTraining.cropFiles', 'Plate crops')}
              </p>
            </div>
          </div>
        </div>

        <div className="ai-train-ocr__toolbar">
          <div className="ai-train-ocr__limit">
            <Label htmlFor="ocr-limit">{tr('ocrTraining.sampleLimit', 'Baseline sample limit')}</Label>
            <Input
              id="ocr-limit"
              type="number"
              min={1}
              max={200}
              className="mt-1 w-28"
              value={sampleLimit}
              onChange={(e) => setSampleLimit(e.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {tr('common.refresh', 'Refresh')}
          </Button>
          <Button
            type="button"
            disabled={!!running}
            onClick={() => void runAction(
              'prereq',
              () => ocrTrainingAPI.runPrereq() as Promise<{ output?: string; status?: OcrStatus }>,
              tr('ocrTraining.prereqOk', 'Prerequisites OK'),
            )}
          >
            <FlaskConical size={16} />
            {running === 'prereq' ? tr('ocrTraining.running', 'Running…') : tr('ocrTraining.checkPrereq', 'Check prerequisites')}
          </Button>
          <Button
            type="button"
            disabled={!!running}
            onClick={() => void runAction(
              'baseline',
              () => ocrTrainingAPI.runBaseline(Number(sampleLimit) || 50) as Promise<{ output?: string; report?: OcrStatus['baseline']; status?: OcrStatus }>,
              tr('ocrTraining.baselineDone', 'Baseline evaluation complete'),
            )}
          >
            <Play size={16} />
            {running === 'baseline' ? tr('ocrTraining.running', 'Running…') : tr('ocrTraining.runBaseline', 'Run baseline')}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!!running}
            onClick={() => void runAction(
              'edge',
              () => ocrTrainingAPI.runEdgeCases() as Promise<{ output?: string; status?: OcrStatus }>,
              tr('ocrTraining.edgeDone', 'Edge cases complete'),
            )}
          >
            <Target size={16} />
            {running === 'edge' ? tr('ocrTraining.running', 'Running…') : tr('ocrTraining.runEdge', 'Edge cases')}
          </Button>
          <Button type="button" variant="outline" asChild>
            <a href="https://github.com/SareachGenZ/CamTraffic/blob/main/docs/training/OCR-FINETUNING-GUIDE.md" target="_blank" rel="noreferrer">
              <BookOpen size={16} /> {tr('ocrTraining.guide', 'Fine-tune guide')}
            </a>
          </Button>
        </div>

        {manifest?.preview && manifest.preview.length > 0 && (
          <div className="ai-train-history__wrap">
            <Table className="enforcement-page__table ai-train-history__table">
              <TableHeader>
                <TableRow className="enforcement-page__table-head">
                  <TableHead className="enforcement-page__th text-left">{tr('ocrTraining.crop', 'Crop')}</TableHead>
                  <TableHead className="enforcement-page__th text-left">{tr('ocrTraining.transcription', 'Transcription')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {manifest.preview.map((row, i) => (
                  <TableRow key={`${row.crop_path}-${i}`} className="enforcement-page__table-row">
                    <TableCell><code className="ai-train-file">{row.crop_path}</code></TableCell>
                    <TableCell>{row.transcription}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {lastOutput && (
          <pre className="ai-train-ocr__output">{lastOutput}</pre>
        )}

        {baseline?.evaluated_at && (
          <p className="ai-train-ocr__meta">
            {tr('ocrTraining.lastEval', 'Last evaluation')}: {new Date(baseline.evaluated_at).toLocaleString()}
            {' · '}
            {tr('ocrTraining.engine', 'Engine')}: {baseline.engine || 'easyocr'}
            {' · '}
            {tr('ocrTraining.samples', 'Samples')}: {baseline.samples ?? 0}
          </p>
        )}
      </div>
    </section>
  );
}

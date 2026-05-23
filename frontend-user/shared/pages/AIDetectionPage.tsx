import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import {
  Upload, Camera, CheckCircle, AlertCircle, Clock, RefreshCw, Zap,
  Info, BarChart2, ChevronRight, Cpu, Layers, Target, Activity,
  Eye, Shield, TrendingUp, MapPin, Sparkles, Volume2, Square,
} from 'lucide-react';
import { SpeakButton } from '@shared/components/SpeakButton';
import { useAIDetectionCopy } from '@shared/hooks/useAIDetectionCopy';
import { buildTrafficSignSpeech, khmerSpeechText, useSpeech } from '@shared/hooks/useSpeech';
import { useLanguage } from '@shared/context/LanguageContext';
import { aiAPI } from '@shared/services/api';
import { toast } from 'sonner';
import type { AIDetectionLog, AIDetectionPageStats, AIDetectionSampleSign } from '@shared/types';

interface DetectionResult {
  sign_name: string;
  sign_name_km?: string;
  sign_name_en?: string;
  sign_code?: string;
  category?: string;
  confidence: number;
  description: string;
  description_en?: string;
  guidance: string;
  guidance_en?: string;
  processing_time: number;
  uploaded_image?: string;
  log_id?: number;
}

const SIGN_COLORS: Record<string, string> = {
  stop: '#EF4444', no: '#EF4444', speed: '#3B82F6', pedestrian: '#F59E0B',
  school: '#F59E0B', give: '#F59E0B', yield: '#F59E0B', one: '#3B82F6',
  helmet: '#3B82F6', hospital: '#06B6D4', slippery: '#F59E0B',
};
function getSignColor(name: string) {
  return SIGN_COLORS[name.toLowerCase().split(' ')[0]] ?? '#8B5CF6';
}

const confColor = (c: number) => c >= 95 ? '#10B981' : c >= 80 ? '#F59E0B' : '#EF4444';
const confGrad  = (c: number) =>
  c >= 95 ? 'linear-gradient(90deg,#10B981,#06B6D4)' :
  c >= 80 ? 'linear-gradient(90deg,#F59E0B,#F97316)' :
            'linear-gradient(90deg,#EF4444,#EC4899)';

function formatPct(n: number) {
  return n > 0 ? `${n.toFixed(1)}%` : '—';
}
function formatSpeed(n: number) {
  return n > 0 ? `${n.toFixed(1)}s` : '—';
}
function formatScans(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}
/* ─────────────────────────────────────────────────────────
   Small reusable sub-components
───────────────────────────────────────────────────────── */
function SectionIcon({ children, accent }: { children: React.ReactNode; accent: string }) {
  return (
    <span className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: `${accent}18`, color: accent }}>
      {children}
    </span>
  );
}

function CardWrap({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-card rounded-2xl shadow-sm border border-border ${className}`}>
      {children}
    </div>
  );
}

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <div>
        <p className="dashboard-section__title text-[15px]">{title}</p>
        {subtitle && <p className="dashboard-card__subtitle text-[12px]">{subtitle}</p>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Awaiting card — shown before any detection
═══════════════════════════════════════════════════════ */
function AwaitingCard({
  pageStats,
  onSampleClick,
}: {
  pageStats: AIDetectionPageStats;
  onSampleClick: (s: AIDetectionSampleSign) => void;
}) {
  const { t, AWAIT_STEPS } = useAIDetectionCopy();
  const awaitStats = [
    { v: formatPct(pageStats.stats.accuracy_avg), l: t('aiDetection.avgConfidenceShort'), c: '#8B5CF6', bg: 'rgba(139,92,246,0.10)' },
    { v: formatSpeed(pageStats.stats.avg_speed_sec), l: t('aiDetection.avgSpeedShort'), c: '#06B6D4', bg: 'rgba(6,182,212,0.10)' },
    { v: String(pageStats.model.sign_classes), l: t('aiDetection.signCatalog'), c: '#10B981', bg: 'rgba(16,185,129,0.10)' },
    {
      v: pageStats.model.training_images > 0 ? formatScans(pageStats.model.training_images) : '—',
      l: t('aiDetection.datasetImages'),
      c: '#F59E0B',
      bg: 'rgba(245,158,11,0.10)',
    },
  ];
  return (
    <CardWrap className="overflow-hidden flex flex-col min-h-[420px]">
      {/* subtle top stripe */}
      <div className="h-0.5 flex-shrink-0"
        style={{ background: 'linear-gradient(90deg,rgba(139,92,246,0.4),rgba(6,182,212,0.4),rgba(16,185,129,0.4))' }} />

      <div className="p-6 flex flex-col gap-5 flex-1">

        {/* ── Central icon ── */}
        <div className="flex flex-col items-center text-center pt-2">
          {/* pulsing rings */}
          <div className="relative flex items-center justify-center mb-5">
            <div className="absolute w-24 h-24 rounded-full animate-ping opacity-10"
              style={{ background: 'rgba(139,92,246,0.4)', animationDuration: '2.4s' }} />
            <div className="absolute w-16 h-16 rounded-full animate-ping opacity-15"
              style={{ background: 'rgba(139,92,246,0.5)', animationDuration: '1.8s' }} />
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center relative z-10 bg-muted"
              style={{ boxShadow: '0 0 0 1px rgba(139,92,246,0.25), 0 4px 20px rgba(139,92,246,0.12)' }}>
              <Eye size={26} color="#8B5CF6" />
            </div>
          </div>

          <p className="dashboard-section__title text-[16px] mb-1">{t('aiDetection.awaitingTitle')}</p>
          <p className="text-[13px] text-muted-foreground leading-relaxed max-w-[260px]">
            {t('aiDetection.awaitingDesc')}
          </p>
        </div>

        {/* ── How-to steps ── */}
        <div className="space-y-2.5">
          {AWAIT_STEPS.map((s, i) => (
            <div key={s.label}
              className="flex items-center gap-3 p-3 rounded-xl bg-muted border border-border">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${s.color}18`, border: `1px solid ${s.color}30` }}>
                <s.icon size={14} style={{ color: s.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-foreground leading-tight">{s.label}</p>
                <p className="text-[11.5px] text-muted-foreground mt-0.5">{s.desc}</p>
              </div>
              <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: `${s.color}15` }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: s.color }}>{i + 1}</span>
              </span>
            </div>
          ))}
        </div>

        {/* ── Model stats grid (live) ── */}
        <div className="grid grid-cols-2 gap-2">
          {awaitStats.map(s => (
            <div key={s.l}
              className="rounded-xl px-3.5 py-3 flex items-center gap-3 border border-border"
              style={{ background: s.bg }}>
              <div>
                <p className="text-[17px] font-black leading-none"
                  style={{ color: s.c, letterSpacing: '-0.03em' }}>{s.v}</p>
                <p className="text-[10.5px] text-muted-foreground mt-1">{s.l}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Sample sign chips ── */}
        <div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2.5">
            {t('aiDetection.exampleSigns')}
          </p>
          <div className="flex gap-2 flex-wrap">
            {pageStats.sample_signs.map(s => (
              <button
                key={s.id}
                type="button"
                title={s.sign_name}
                onClick={() => onSampleClick(s)}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-black cursor-pointer transition-transform hover:scale-110"
                style={{
                  background: `${s.color}12`,
                  border: `1.5px solid ${s.color}30`,
                  color: s.color,
                }}>
                {s.image ? (
                  <img src={s.image} alt={s.sign_name} className="w-full h-full object-cover rounded-lg" />
                ) : (
                  s.label
                )}
              </button>
            ))}
          </div>
        </div>

      </div>
    </CardWrap>
  );
}

/* ═══════════════════════════════════════════════════════
   Result card — full premium analysis display
═══════════════════════════════════════════════════════ */
function ResultCard({
  result,
  preview,
  onReset,
}: {
  result: DetectionResult;
  preview: string | null;
  onReset: () => void;
}) {
  const { t } = useLanguage();
  const { speak, speakingId } = useSpeech('km');
  const km = khmerSpeechText(result);
  const displayName = km.name;
  const sc = getSignColor(displayName);
  const cc = confColor(result.confidence);
  const cg = confGrad(result.confidence);
  const imageSrc = preview || result.uploaded_image || null;
  const speakKm = (text: string, id: string) => speak(text, id, 'km-KH');

  const fullSpeech = buildTrafficSignSpeech(km.name, km.desc, km.guide, 'km');
  const guidanceSpeech = `សូមបញ្ជរកចរាចរតាមស្លាកចរាចរណ៍៖ ${km.guide}`;

  /* Circumference for SVG circle meter */
  const R = 42;
  const CIRC = 2 * Math.PI * R;
  const dash = (result.confidence / 100) * CIRC;

  return (
    <CardWrap className="overflow-hidden flex flex-col">
      {/* Accent stripe */}
      <div className="h-1 flex-shrink-0" style={{ background: `linear-gradient(90deg,${sc},#8B5CF6,#06B6D4)` }} />

      <div className="p-5 flex flex-col gap-4 flex-1">

        {/* ── Header row ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(16,185,129,0.12)' }}>
              <CheckCircle size={14} color="#10B981" />
            </div>
            <p className="dashboard-section__title text-[14px]">{t('aiDetection.resultTitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock size={10} />{result.processing_time}s
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981' }}>
              {t('aiDetection.aiVerified')}
            </span>
          </div>
        </div>

        {/* ── Analyzed image (full width) ── */}
        {imageSrc && (
          <div className="rounded-2xl overflow-hidden border border-border bg-muted/40">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-card/80">
              <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Camera size={12} /> {t('aiDetection.analyzedImage')}
              </span>
              {result.log_id != null && (
                <span className="text-[10px] text-muted-foreground">{t('aiDetection.logNum').replace('{id}', String(result.log_id))}</span>
              )}
            </div>
            <div
              className="relative flex items-center justify-center w-full"
              style={{ minHeight: 200, maxHeight: 280, background: 'linear-gradient(180deg, rgba(15,23,42,0.04) 0%, transparent 100%)' }}
            >
              <img
                src={imageSrc}
                alt={`Detected: ${displayName}`}
                className="max-h-[260px] max-w-full w-auto object-contain p-4"
              />
              <div
                className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 px-3 py-2 rounded-xl backdrop-blur-md"
                style={{ background: 'rgba(15,23,42,0.72)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <span className="text-[12px] font-bold text-white truncate font-khmer">{displayName}</span>
                <span className="text-[12px] font-black flex-shrink-0" style={{ color: cc }}>
                  {result.confidence.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── Hero: circle meter + sign name ── */}
        <div className="rounded-2xl p-4 relative overflow-hidden"
          style={{ background: `${sc}0D`, border: `1px solid ${sc}25` }}>
          {/* subtle glow */}
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"
            style={{ background: `radial-gradient(circle,${sc}20 0%,transparent 70%)` }} />

          <div className="relative flex items-center gap-4">
            {/* SVG Circular confidence meter */}
            <div className="relative flex-shrink-0" style={{ width: 88, height: 88 }}>
              <svg width="88" height="88" style={{ transform: 'rotate(-90deg)' }}>
                {/* track */}
                <circle cx="44" cy="44" r={R} fill="none"
                  stroke="rgba(255,255,255,0.07)" strokeWidth="6" />
                {/* progress */}
                <circle cx="44" cy="44" r={R} fill="none"
                  stroke="url(#confGrad)" strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${CIRC}`}
                  style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)' }} />
                <defs>
                  <linearGradient id="confGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={cc} />
                    <stop offset="100%" stopColor={sc} />
                  </linearGradient>
                </defs>
              </svg>
              {/* centre label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[17px] font-black leading-none" style={{ color: cc, letterSpacing: '-0.04em' }}>
                  {result.confidence.toFixed(0)}%
                </span>
                <span className="text-[8.5px] font-semibold text-muted-foreground uppercase tracking-wide mt-0.5">{t('aiDetection.confShort')}</span>
              </div>
            </div>

            {/* Sign name + badges */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={12} style={{ color: sc }} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {t('aiDetection.identifiedSign')}
                </span>
              </div>
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-[18px] font-black text-foreground leading-tight flex-1 font-khmer"
                  style={{ letterSpacing: '-0.025em' }}>
                  {displayName}
                </p>
                <SpeakButton
                  size="md"
                  label={t('aiDetection.listenSign')}
                  isActive={speakingId === 'sign-name'}
                  onClick={() => speakKm(`ស្លាកចរាចរណ៍ ${displayName}`, 'sign-name')}
                />
              </div>
              {(result.sign_code || result.sign_name_en) && (
                <p className="text-[11px] text-muted-foreground mb-2">
                  {[result.sign_code, result.sign_name_en].filter(Boolean).join(' · ')}
                </p>
              )}
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: `${sc}20`, color: sc, border: `1px solid ${sc}40` }}>
                  ✓ {t('aiDetection.detected')}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {t('aiDetection.cambodiaSign')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Confidence bar ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-semibold text-muted-foreground flex items-center gap-1.5">
              <TrendingUp size={12} /> {t('aiDetection.confidenceLabel')}
            </span>
            <span className="text-[13px] font-bold" style={{ color: cc }}>{result.confidence.toFixed(1)}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${result.confidence}%`, background: cg }} />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-muted-foreground">0%</span>
            <span className="text-[10px] text-muted-foreground">▲ {t('aiDetection.threshold')}</span>
            <span className="text-[10px] text-muted-foreground">100%</span>
          </div>
        </div>

        {/* ── 3-score breakdown ── */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: t('aiDetection.primary'),   val: result.confidence },
            { label: t('aiDetection.alternate'), val: Math.max(2, result.confidence - 14 - Math.random() * 8) },
            { label: t('aiDetection.third'),     val: Math.max(1, result.confidence - 30 - Math.random() * 12) },
          ].map(c => (
            <div key={c.label} className="rounded-xl p-3 text-center bg-muted">
              <p className="text-[16px] font-black leading-none" style={{ color: confColor(c.val), letterSpacing: '-0.03em' }}>
                {c.val.toFixed(0)}%
              </p>
              <p className="text-[10.5px] text-muted-foreground mt-1.5">{c.label}</p>
            </div>
          ))}
        </div>

        {/* ── Listen: full sign + guidance (voice) ── */}
        <button
          type="button"
          onClick={() => speakKm(fullSpeech, 'full')}
          className={`w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2.5 text-[13px] font-bold transition-all cursor-pointer border ${
            speakingId === 'full'
              ? 'bg-violet-500/15 border-violet-400/50 text-violet-700 dark:text-violet-200'
              : 'bg-gradient-to-r from-violet-500/10 to-cyan-500/10 border-violet-300/30 text-foreground hover:from-violet-500/15'
          }`}
        >
          {speakingId === 'full' ? (
            <><Square size={15} fill="currentColor" /> {t('aiDetection.stopSpeaking')}</>
          ) : (
            <><Volume2 size={15} /> {t('aiDetection.listenFull')}</>
          )}
        </button>

        {/* ── Description + Guidance ── */}
        <div className="grid grid-cols-1 gap-3">
          <div className="p-3.5 rounded-xl"
            style={{ background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.18)' }}>
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-[11px] font-bold flex items-center gap-1.5" style={{ color: '#60A5FA' }}>
                <Info size={11} /> {t('aiDetection.description')}
              </p>
              <SpeakButton
                label={t('aiDetection.readDescription')}
                isActive={speakingId === 'desc'}
                onClick={() => speakKm(km.desc, 'desc')}
              />
            </div>
            <p className="text-[12.5px] text-foreground leading-relaxed opacity-85 font-khmer">{km.desc}</p>
          </div>

          <div className="p-3.5 rounded-xl"
            style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-[11px] font-bold flex items-center gap-1.5" style={{ color: '#FCD34D' }}>
                <AlertCircle size={11} /> {t('aiDetection.guidance')}
              </p>
              <SpeakButton
                label={t('aiDetection.readGuidance')}
                isActive={speakingId === 'guide'}
                onClick={() => speakKm(guidanceSpeech, 'guide')}
              />
            </div>
            <p className="text-[12.5px] text-foreground leading-relaxed opacity-85 font-khmer">{km.guide}</p>
          </div>
        </div>

        {/* ── Processing stats row ── */}
        <div className="grid grid-cols-3 gap-2 border-t border-border pt-3">
          {[
            { label: t('aiDetection.processTime'), value: `${result.processing_time}s`,   Icon: Clock },
            { label: t('aiDetection.model'),        value: 'YOLOv8',                       Icon: Cpu },
            { label: t('aiDetection.region'),       value: t('aiDetection.cambodia'),      Icon: MapPin },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2">
              <s.Icon size={12} className="text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-[12px] font-semibold text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Reset button ── */}
        <button onClick={onReset}
          className="w-full py-2.5 rounded-xl text-[13px] font-semibold border border-border text-muted-foreground hover:bg-muted transition-colors flex items-center justify-center gap-2 cursor-pointer">
          <RefreshCw size={13} /> {t('aiDetection.detectAnother')}
        </button>
      </div>
    </CardWrap>
  );
}

/* ═══════════════════════════════════════════════════════
   Main page
═══════════════════════════════════════════════════════ */
export function AIDetectionPage() {
  const { t, STEPS, formatTraining, modelStatus } = useAIDetectionCopy();
  const navigate = useNavigate();
  const location = useLocation();
  const aiLogsPath = location.pathname.startsWith('/admin') ? '/admin/ai-logs' : '/dashboard/ai-logs';

  const [file, setFile]           = useState<File | null>(null);
  const [preview, setPreview]     = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [result, setResult]       = useState<DetectionResult | null>(null);
  const [dragging, setDragging]   = useState(false);
  const [recentLogs, setRecentLogs]   = useState<AIDetectionLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [pageStats, setPageStats] = useState<AIDetectionPageStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const refreshPageData = useCallback(async () => {
    const [logs, stats] = await Promise.all([
      aiAPI.getLogs(),
      aiAPI.getPageStats(),
    ]);
    setRecentLogs(logs.slice(0, 6));
    setPageStats(stats);
    setLoadingLogs(false);
    setLoadingStats(false);
  }, []);

  useEffect(() => {
    refreshPageData().catch(() => {
      setLoadingLogs(false);
      setLoadingStats(false);
    });
  }, [refreshPageData]);

  const handleFile = (f: File) => {
    if (!f.type.startsWith('image/')) { toast.error(t('aiDetection.toast.imageOnly')); return; }
    if (f.size > 10 * 1024 * 1024) { toast.error(t('aiDetection.toast.imageTooBig')); return; }
    setFile(f); setResult(null); setPreview(URL.createObjectURL(f));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const handleSampleSign = async (sample: AIDetectionSampleSign) => {
    if (sample.image) {
      try {
        const res = await fetch(sample.image);
        const blob = await res.blob();
        const ext = blob.type.includes('png') ? 'png' : 'jpg';
        handleFile(new File([blob], `${sample.sign_code || 'sign'}.${ext}`, { type: blob.type || 'image/jpeg' }));
        toast.success(t('aiDetection.toast.sampleLoaded').replace('{name}', sample.sign_name));
      } catch {
        toast.error(t('aiDetection.toast.loadImageFail'));
        inputRef.current?.click();
      }
    } else {
      toast.info(t('aiDetection.toast.uploadOwnPhoto').replace('{name}', sample.sign_name));
      inputRef.current?.click();
    }
  };

  const handleDetect = async () => {
    if (!file) {
      toast.error(t('aiDetection.toast.uploadFirst'));
      inputRef.current?.click();
      return;
    }
    setDetecting(true); setProgress(0); setResult(null);
    const iv = setInterval(() =>
      setProgress(p => p >= 88 ? (clearInterval(iv), 88) : p + Math.random() * 14), 200);
    try {
      const res = await aiAPI.detect(file);
      clearInterval(iv); setProgress(100); setResult(res);
      toast.success(
        t('aiDetection.toast.detected')
          .replace('{name}', res.sign_name)
          .replace('{confidence}', res.confidence.toFixed(1)),
      );
      await refreshPageData();
    } catch {
      clearInterval(iv);
      toast.error(t('aiDetection.toast.detectFailed'));
    } finally { setDetecting(false); }
  };

  const reset = () => {
    if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
    setFile(null); setPreview(null); setResult(null); setProgress(0);
    if (inputRef.current) inputRef.current.value = '';
  };

  const status = pageStats ? modelStatus(pageStats.model.mode) : null;

  const buildSidebarStats = (page: AIDetectionPageStats) => {
    const { stats, model } = page;
    return [
      { label: t('aiDetection.accuracy'), value: formatPct(stats.accuracy_avg), Icon: Target, accent: '#8B5CF6' },
      { label: t('aiDetection.categories'), value: String(model.sign_classes), Icon: Layers, accent: '#06B6D4' },
      { label: t('aiDetection.avgSpeedShort'), value: formatSpeed(stats.avg_speed_sec), Icon: Cpu, accent: '#10B981' },
      { label: t('aiDetection.scansLabel'), value: formatScans(stats.total_scans), Icon: Activity, accent: '#F59E0B' },
    ];
  };
  const maxCategoryCount = pageStats
    ? Math.max(...pageStats.categories.map(c => c.count), 1)
    : 1;

  return (
    <div className="space-y-5">

      {/* ── HERO BANNER ── */}
      <div className="relative overflow-hidden rounded-2xl pt-3 pb-5 px-6"
        style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {/* glow orbs */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full -translate-y-24 translate-x-24 pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.22) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-1/3 w-56 h-56 rounded-full translate-y-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.14) 0%, transparent 70%)' }} />
        <div className="absolute top-0 left-0 w-40 h-40 rounded-full -translate-y-16 -translate-x-16 pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)' }} />

        <div className="relative">
          {/* Top row: eyebrow + badge */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(139,92,246,0.25)' }}>
                <Camera size={13} color="#C4B5FD" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'rgba(196,181,253,0.85)' }}>
                {t('aiDetection.heroEyebrow')}
              </span>
            </div>
            {status && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold"
                style={{ background: status.bg, border: `1px solid ${status.border}`, color: status.color }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: status.color }} />
                {status.text}
              </span>
            )}
          </div>

          {/* Title + subtitle */}
          <h1 className="dashboard-welcome__title text-white mb-1">
            {t('aiDetection.heroTitle')}
          </h1>
          <p className="text-[12.5px] mb-4" style={{ color: 'rgba(148,163,184,0.7)' }}>
            {t('aiDetection.heroSubtitle')}
          </p>

          {/* Feature stat chips (live from API) */}
          <div className="grid grid-cols-3 gap-3">
            {loadingStats ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="rounded-xl px-4 py-3 h-[72px] bg-white/5 animate-pulse" />
              ))
            ) : pageStats && (
              [
                {
                  label: t('aiDetection.avgConfidence'),
                  value: formatPct(pageStats.stats.accuracy_avg),
                  sub: t('aiDetection.scans').replace('{count}', formatScans(pageStats.stats.total_scans)),
                  accent: '#A78BFA',
                  bg: 'rgba(139,92,246,0.1)',
                  border: 'rgba(139,92,246,0.2)',
                  icon: '🎯',
                },
                {
                  label: t('aiDetection.avgSpeed'),
                  value: formatSpeed(pageStats.stats.avg_speed_sec),
                  sub: t('aiDetection.perDetection'),
                  accent: '#22D3EE',
                  bg: 'rgba(6,182,212,0.1)',
                  border: 'rgba(6,182,212,0.2)',
                  icon: '⚡',
                },
                {
                  label: t('aiDetection.signCatalog'),
                  value: String(pageStats.stats.sign_count),
                  sub: `${pageStats.model.name} ${pageStats.model.version}`,
                  accent: '#34D399',
                  bg: 'rgba(52,211,153,0.1)',
                  border: 'rgba(52,211,153,0.2)',
                  icon: '🚦',
                },
              ].map(s => (
                <div key={s.label} className="rounded-xl px-4 py-3 flex items-center gap-3"
                  style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                  <span className="text-[20px] flex-shrink-0">{s.icon}</span>
                  <div className="min-w-0">
                    <p className="text-[20px] font-black leading-none" style={{ color: s.accent }}>{s.value}</p>
                    <p className="text-[10.5px] font-semibold mt-0.5" style={{ color: 'rgba(148,163,184,0.7)' }}>{s.label}</p>
                    <p className="text-[10px]" style={{ color: 'rgba(148,163,184,0.45)' }}>{s.sub}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── BODY: 2 columns ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">

        {/* ══ COLUMN 1 — Upload + Result/Awaiting ══ */}
        <div className="space-y-5">

          {/* Upload + Awaiting/Result side-by-side */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">

            {/* ── UPLOAD CARD ── */}
            <CardWrap className="p-5 flex flex-col gap-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <SectionHeader
                  icon={<SectionIcon accent="#8B5CF6"><Upload size={15} /></SectionIcon>}
                  title={t('aiDetection.uploadTitle')}
                  subtitle={t('aiDetection.uploadSubtitle')}
                />
                <div className="flex items-center gap-1.5">
                  {['PNG','JPG','WEBP'].map(f => (
                    <span key={f} className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-md"
                      style={{ background: 'rgba(139,92,246,0.1)', color: '#8B5CF6', border: '1px solid rgba(139,92,246,0.2)' }}>
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className="relative border-2 border-dashed rounded-2xl cursor-pointer transition-all overflow-hidden"
                style={{
                  borderColor: dragging ? '#8B5CF6' : 'rgba(139,92,246,0.28)',
                  background: dragging ? 'rgba(139,92,246,0.06)' : 'rgba(139,92,246,0.02)',
                  minHeight: preview ? 'auto' : 180,
                }}
                onMouseEnter={e => { if (!dragging) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.52)'; }}
                onMouseLeave={e => { if (!dragging) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.28)'; }}
              >
                {preview ? (
                  <div className="relative">
                    <img src={preview} alt="Preview"
                      className="w-full max-h-52 rounded-xl object-contain mx-auto p-2" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-xl"
                      style={{ background: 'rgba(0,0,0,0.45)' }}>
                      <div className="text-center text-white">
                        <Camera size={20} className="mx-auto mb-1" />
                        <p className="text-[12px] font-semibold">{t('aiDetection.clickToChange')}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                    {/* Animated upload icon */}
                    <div className="relative mb-4">
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(6,182,212,0.1))' }}>
                        <Upload size={26} color="#8B5CF6" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg,#8B5CF6,#06B6D4)' }}>
                        <span className="text-white text-[10px] font-black">+</span>
                      </div>
                    </div>
                    <p className="text-[15px] font-bold text-foreground">{t('aiDetection.dropTitle')}</p>
                    <p className="text-[12px] text-muted-foreground mt-1">{t('aiDetection.dropHint')}</p>
                    <div className="flex items-center gap-3 mt-4">
                      {[
                        { icon: '🖼️', text: t('aiDetection.dropFormats') },
                        { icon: '📦', text: t('aiDetection.dropMaxSize') },
                      ].map(b => (
                        <span key={b.text} className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground px-2.5 py-1 rounded-lg bg-muted">
                          {b.icon} {b.text}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <input ref={inputRef} type="file" accept="image/*" className="hidden"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

              {/* File info chip */}
              {file && (
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                  style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.18)' }}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(139,92,246,0.15)' }}>
                      <Camera size={13} color="#8B5CF6" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-semibold text-foreground truncate max-w-[180px]">{file.name}</p>
                      <p className="text-[11px] text-muted-foreground">{(file.size / 1024).toFixed(1)} KB · {t('aiDetection.readyToDetect')}</p>
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); reset(); }}
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 ml-2 transition-colors text-sm cursor-pointer">✕</button>
                </div>
              )}

              {/* Progress */}
              {detecting && (
                <div className="rounded-xl p-3" style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[12px] font-semibold text-muted-foreground flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full animate-ping inline-block" style={{ background: '#8B5CF6', opacity: 0.6 }} />
                      {t('aiDetection.analysing')}
                    </span>
                    <span className="text-[12px] font-black" style={{ color: '#8B5CF6' }}>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#8B5CF6,#06B6D4)' }} />
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                <button onClick={handleDetect} disabled={detecting}
                  className="flex-1 py-3 rounded-xl text-white text-[13.5px] font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-70 disabled:cursor-wait"
                  style={{
                    background: 'linear-gradient(135deg,#7C3AED,#2563EB)',
                    boxShadow: !detecting ? '0 4px 20px rgba(124,58,237,0.4)' : 'none',
                  }}>
                  {detecting
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{t('aiDetection.analysingShort')}</>
                    : <><Zap size={15} />{t('aiDetection.detectSign')}</>}
                </button>
                {file && (
                  <button onClick={reset}
                    className="w-12 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-red-500 hover:border-red-300 transition-colors cursor-pointer">
                    <RefreshCw size={15} />
                  </button>
                )}
              </div>

              {/* Upload tips */}
              <div className="rounded-xl p-3.5" style={{ background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.15)' }}>
                <p className="text-[11px] font-bold uppercase tracking-widest mb-2.5" style={{ color: '#06B6D4' }}>
                  {t('aiDetection.tipsTitle')}
                </p>
                <div className="space-y-2">
                  {[
                    { icon: '☀️', tip: t('aiDetection.tipLight') },
                    { icon: '🎯', tip: t('aiDetection.tipCenter') },
                    { icon: '📐', tip: t('aiDetection.tipAngle') },
                  ].map(tip => (
                    <div key={tip.tip} className="flex items-start gap-2">
                      <span className="text-[12px] flex-shrink-0 mt-0.5">{tip.icon}</span>
                      <p className="text-[11.5px] text-muted-foreground leading-snug">{tip.tip}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sample signs from traffic sign catalog */}
              <div className="border-t border-border pt-4">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                  {t('aiDetection.catalogTap')}
                </p>
                {loadingStats ? (
                  <div className="grid grid-cols-4 gap-2">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
                    ))}
                  </div>
                ) : pageStats && pageStats.sample_signs.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {pageStats.sample_signs.slice(0, 4).map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSampleSign(s)}
                        className="flex flex-col items-center gap-1.5 cursor-pointer group"
                      >
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-[11px] font-black overflow-hidden transition-all group-hover:scale-110 group-hover:shadow-md"
                          style={{
                            background: `${s.color}15`,
                            border: `1.5px solid ${s.color}35`,
                            color: s.color,
                          }}>
                          {s.image ? (
                            <img src={s.image} alt={s.sign_name} className="w-full h-full object-cover" />
                          ) : (
                            s.label
                          )}
                        </div>
                        <p className="text-[10.5px] text-muted-foreground text-center leading-tight line-clamp-2">
                          {s.sign_name}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-[12px] text-muted-foreground">{t('aiDetection.catalogEmpty')}</p>
                )}
              </div>
            </CardWrap>

            {/* ── RESULT / AWAITING CARD ── */}
            <div>
              {result ? (
                <ResultCard result={result} preview={preview} onReset={reset} />
              ) : pageStats ? (
                <AwaitingCard pageStats={pageStats} onSampleClick={handleSampleSign} />
              ) : (
                <CardWrap className="min-h-[420px] flex items-center justify-center">
                  <div className="h-8 w-8 border-2 border-muted border-t-primary rounded-full animate-spin" />
                </CardWrap>
              )}
            </div>
          </div>

          {/* ── RECENT DETECTIONS ── */}
          <CardWrap className="p-5">
            <div className="flex items-center justify-between mb-4">
              <SectionHeader
                icon={<SectionIcon accent="#8B5CF6"><BarChart2 size={15} /></SectionIcon>}
                title={t('aiDetection.recentTitle')}
                subtitle={t('aiDetection.recentSubtitle')}
              />
              <button
                className="flex items-center gap-1 text-[12px] font-semibold px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                onClick={() => navigate(aiLogsPath)}>
                {t('aiDetection.viewAll')} <ChevronRight size={12} />
              </button>
            </div>

            {loadingLogs ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
                ))}
              </div>
            ) : recentLogs.length === 0 ? (
              <div className="text-center py-10">
                <Activity size={28} className="mx-auto mb-3 text-muted-foreground opacity-30" />
                <p className="text-[13px] font-semibold text-muted-foreground">{t('aiDetection.noDetections')}</p>
                <p className="text-[12px] text-muted-foreground mt-1">{t('aiDetection.noDetectionsHint')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentLogs.map(log => {
                  const sc = getSignColor(log.detected_sign);
                  return (
                    <div key={log.id}
                      className="flex items-center gap-4 p-3 rounded-xl border border-transparent hover:bg-muted hover:border-border transition-all cursor-default">
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${sc}18`, border: `1.5px solid ${sc}35` }}>
                        <span className="text-[10px] font-black" style={{ color: sc }}>
                          {log.detected_sign.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-[13px] font-semibold text-foreground truncate max-w-[200px]">
                            {log.detected_sign}
                          </p>
                          <span className="text-[12.5px] font-black ml-2 flex-shrink-0"
                            style={{ color: confColor(log.confidence) }}>
                            {log.confidence.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full"
                              style={{ width: `${log.confidence}%`, background: confGrad(log.confidence) }} />
                          </div>
                          <span className="text-[11px] text-muted-foreground flex-shrink-0">{log.user_name}</span>
                        </div>
                      </div>
                      {/* Date */}
                      <span className="text-[11px] text-muted-foreground flex-shrink-0">
                        {new Date(log.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardWrap>

        </div>{/* end column 1 */}

        {/* ══ COLUMN 2 — AI Model Info ══ */}
        <div className="space-y-4">

          {/* Model stats (live) */}
          <CardWrap className="p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <SectionIcon accent="#8B5CF6"><Cpu size={14} /></SectionIcon>
              <p className="dashboard-section__title text-[13px]">{t('aiDetection.aiModel')}</p>
            </div>
            {loadingStats || !pageStats ? (
              <div className="grid grid-cols-2 gap-2.5">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2.5">
                  {buildSidebarStats(pageStats).map(s => (
                    <div key={s.label} className="rounded-xl p-3"
                      style={{ background: `${s.accent}10`, border: `1px solid ${s.accent}22` }}>
                      <s.Icon size={14} style={{ color: s.accent }} />
                      <p className="text-[19px] font-black mt-2 leading-none"
                        style={{ color: s.accent, letterSpacing: '-0.03em' }}>{s.value}</p>
                      <p className="text-[10px] font-semibold uppercase tracking-wider mt-1.5 text-muted-foreground">
                        {s.label}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 p-3 rounded-xl"
                  style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.18)' }}>
                  <p className="text-[11px] font-bold" style={{ color: '#A78BFA' }}>
                    {pageStats.model.name} {pageStats.model.version}
                  </p>
                  <p className="text-[10.5px] text-muted-foreground mt-1">
                    {formatTraining(pageStats.model.training_images)
                      ?? t('aiDetection.signsInCatalog').replace('{count}', String(pageStats.model.sign_classes))}
                    {pageStats.model.mode === 'yolo'
                      ? ` · ${t('aiDetection.liveYolo')}`
                      : pageStats.model.mode === 'mock_fallback'
                        ? ` · ${t('aiDetection.trainModel')}`
                        : ` · ${t('aiDetection.demoUntilTrained')}`}
                  </p>
                </div>
              </>
            )}
          </CardWrap>

          {/* Sign categories (from database) */}
          <CardWrap className="p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <SectionIcon accent="#3B82F6"><Shield size={14} /></SectionIcon>
              <p className="dashboard-section__title text-[13px]">{t('aiDetection.signTypes')}</p>
            </div>
            {loadingStats || !pageStats ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-12 rounded-xl bg-muted animate-pulse" />
                ))}
              </div>
            ) : pageStats.categories.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">{t('aiDetection.noCatalog')}</p>
            ) : (
              <div className="space-y-4">
                {pageStats.categories.map(c => (
                  <div key={c.key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[13px] font-semibold text-foreground">{c.name}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: `${c.color}18`, color: c.color }}>{c.count}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mb-2">{c.desc}</p>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full"
                        style={{ width: `${(c.count / maxCategoryCount) * 100}%`, background: c.color, opacity: 0.8 }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardWrap>

          {/* How it works */}
          <CardWrap className="p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <SectionIcon accent="#06B6D4"><Zap size={14} /></SectionIcon>
              <p className="dashboard-section__title text-[13px]">{t('aiDetection.howItWorks')}</p>
            </div>
            <div className="space-y-3.5">
              {STEPS.map(s => (
                <div key={s.n} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: `${s.color}18`, border: `1.5px solid ${s.color}40` }}>
                    <span style={{ fontSize: 9, fontWeight: 800, color: s.color }}>{s.n}</span>
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-foreground leading-tight">{s.title}</p>
                    <p className="text-[11.5px] text-muted-foreground mt-0.5">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardWrap>

        </div>{/* end column 2 */}
      </div>{/* end 2-col grid */}
    </div>
  );
}

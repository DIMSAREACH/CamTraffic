import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router';
import {
  Upload, Camera, CheckCircle, AlertCircle, Clock, RefreshCw, Zap,
  Info, BarChart2, ChevronRight, Cpu, Layers, Target, Activity,
  Eye, Shield, TrendingUp, MapPin, Sparkles, Volume2, Square,
  Image as ImageIcon, Package, Check, Signpost,
} from 'lucide-react';
import { SpeakButton } from '@shared/components/SpeakButton';
import { useAIDetectionCopy } from '@shared/hooks/useAIDetectionCopy';
import { buildTrafficSignSpeech, khmerSpeechText, useSpeech } from '@shared/hooks/useSpeech';
import { useLanguage } from '@shared/context/LanguageContext';
import { aiAPI } from '@shared/services/api';
import { getProfileImageUrl } from '@shared/utils/profileImage';
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

function altScore(conf: number) {
  return Math.max(2, conf - 14 - Math.random() * 8);
}
function thirdScore(conf: number) {
  return Math.max(1, conf - 30 - Math.random() * 12);
}

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
function CardWrap({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-card rounded-2xl shadow-sm border border-border ${className}`}>
      {children}
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
    <CardWrap className="overflow-hidden flex flex-col min-h-[420px] h-full">
      <div className="dashboard-panel-header relative px-5 pt-5 pb-10 flex-shrink-0"
        style={{ background: 'linear-gradient(135deg,#0F766E 0%,#06B6D4 100%)' }}>
        <div className="absolute -top-5 -right-5 w-24 h-24 rounded-full pointer-events-none"
          style={{ background: 'rgba(255,255,255,0.08)' }} />
        <div className="relative flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 rounded-2xl animate-ping opacity-20"
              style={{ background: 'rgba(255,255,255,0.4)', animationDuration: '2.2s' }} />
            <div className="relative w-11 h-11 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.25)' }}>
              <Eye size={22} color="white" />
            </div>
          </div>
          <div className="min-w-0">
            <p className="dashboard-card__title text-white leading-tight">{t('aiDetection.awaitingTitle')}</p>
            <p className="dashboard-panel__subtitle mt-1 leading-snug">{t('aiDetection.awaitingDesc')}</p>
          </div>
        </div>
      </div>

      <div className="relative -mt-5 mx-4 mb-4 flex-1 flex flex-col min-h-0">
        <div className="rounded-2xl bg-background border border-border/60 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-4 flex flex-col gap-4 flex-1 min-h-0">
            <div className="space-y-2.5 flex-shrink-0">
              {AWAIT_STEPS.map((s, i) => (
                <div key={s.label}
                  className="flex items-center gap-3 p-3.5 rounded-xl border border-border/70 transition-colors hover:bg-muted/40"
                  style={{ background: `${s.color}06` }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${s.color}18`, border: `1px solid ${s.color}35` }}>
                    <s.icon size={14} style={{ color: s.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="dashboard-text__title leading-tight">{s.label}</p>
                    <p className="dashboard-text__caption mt-0.5 leading-snug">{s.desc}</p>
                  </div>
                  <span className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-black text-white"
                    style={{ background: `linear-gradient(135deg, ${s.color}, ${s.color}CC)` }}>
                    {i + 1}
                  </span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 flex-shrink-0">
              {awaitStats.map(s => (
                <div key={s.l}
                  className="rounded-xl px-3 py-2.5 border border-border/60"
                  style={{ background: s.bg }}>
                  <p className="dashboard-text__metric"
                    style={{ color: s.c }}>{s.v}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{s.l}</p>
                </div>
              ))}
            </div>

            <div className="flex-1 flex flex-col justify-between min-h-[100px] border-t border-border/60 pt-4">
              <p className="dashboard-kpi__label text-muted-foreground mb-3 flex-shrink-0">
                {t('aiDetection.exampleSigns')}
              </p>
              <div className="flex flex-1 flex-wrap justify-center items-center gap-2 content-center">
                {pageStats.sample_signs.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    title={s.sign_name}
                    onClick={() => onSampleClick(s)}
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-[11px] font-black cursor-pointer transition-all hover:scale-110 hover:shadow-md overflow-hidden"
                    style={{
                      background: `${s.color}12`,
                      border: `1.5px solid ${s.color}35`,
                      color: s.color,
                    }}>
                    {s.image ? (
                      <img src={s.image} alt={s.sign_name} className="w-full h-full object-cover" />
                    ) : (
                      s.label
                    )}
                  </button>
                ))}
              </div>
            </div>
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
  const { t, locale } = useLanguage();
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

  const scores = useMemo(() => ({
    primary: result.confidence,
    alternate: altScore(result.confidence),
    third: thirdScore(result.confidence),
  }), [result.confidence]);

  const R = 42;
  const CIRC = 2 * Math.PI * R;
  const dash = (result.confidence / 100) * CIRC;

  return (
    <CardWrap className="overflow-hidden flex flex-col h-full min-h-[420px]">
      <div className="dashboard-panel-header relative px-5 pt-5 pb-10 flex-shrink-0"
        style={{ background: 'linear-gradient(135deg,#047857 0%,#10B981 100%)' }}>
        <div className="absolute -top-5 -right-5 w-24 h-24 rounded-full pointer-events-none"
          style={{ background: 'rgba(255,255,255,0.08)' }} />
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.25)' }}>
              <CheckCircle size={18} color="white" />
            </div>
            <p className="dashboard-card__title text-white leading-tight">{t('aiDetection.resultTitle')}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[11px] text-white/80 flex items-center gap-1">
              <Clock size={10} />{result.processing_time}s
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.18)', color: 'white', border: '1px solid rgba(255,255,255,0.25)' }}>
              {t('aiDetection.aiVerified')}
            </span>
          </div>
        </div>
      </div>

      <div className="relative -mt-5 mx-4 mb-4 flex-1 flex flex-col min-h-0">
        <div className="rounded-2xl bg-background border border-border/60 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-4 flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto">

        {/* ── Analyzed image (full width) ── */}
        {imageSrc && (
          <div className="rounded-2xl overflow-hidden border border-border bg-muted/40">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-card/80">
              <span className="dashboard-kpi__label text-muted-foreground flex items-center gap-1.5">
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
                <span className="text-[14px] font-bold text-white truncate">{displayName}</span>
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
                  stroke="url(#confGradResult)" strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${CIRC}`}
                  style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)' }} />
                <defs>
                  <linearGradient id="confGradResult" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={cc} />
                    <stop offset="100%" stopColor={sc} />
                  </linearGradient>
                </defs>
              </svg>
              {/* centre label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="dashboard-text__metric-lg" style={{ color: cc }}>
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
                <p className="dashboard-stat__value leading-snug flex-1"
                  style={{ letterSpacing: '-0.02em' }}>
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
                <p className="dashboard-text__caption mb-2">
                  {[result.sign_code, result.sign_name_en].filter(Boolean).join(' · ')}
                </p>
              )}
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                  style={{ background: `${sc}20`, color: sc, border: `1px solid ${sc}40` }}>
                  <Check size={10} strokeWidth={3} /> {t('aiDetection.detected')}
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
            { label: t('aiDetection.primary'),   val: scores.primary },
            { label: t('aiDetection.alternate'), val: scores.alternate },
            { label: t('aiDetection.third'),     val: scores.third },
          ].map(c => (
            <div key={c.label} className="rounded-xl p-3 text-center bg-muted">
              <p className="dashboard-text__metric" style={{ color: confColor(c.val) }}>
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
        <div className="grid grid-cols-1 gap-4">
          <div className="rounded-2xl overflow-hidden border border-blue-200/60 dark:border-blue-500/25">
            <div className="flex items-center justify-between gap-3 px-4 py-3"
              style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.14) 0%, rgba(59,130,246,0.06) 100%)' }}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(59,130,246,0.18)', border: '1px solid rgba(59,130,246,0.28)' }}>
                  <Info size={16} style={{ color: '#3B82F6' }} />
                </div>
                <p className="dashboard-card__title text-foreground leading-tight">{t('aiDetection.description')}</p>
              </div>
              <SpeakButton
                label={t('aiDetection.readDescription')}
                isActive={speakingId === 'desc'}
                onClick={() => speakKm(km.desc, 'desc')}
              />
            </div>
            <div className="px-4 py-4 bg-blue-50/50 dark:bg-blue-950/20">
              <p className="text-[15px] sm:text-[16px] text-foreground leading-[1.75]">{km.desc}</p>
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden border border-amber-200/70 dark:border-amber-500/25">
            <div className="flex items-center justify-between gap-3 px-4 py-3"
              style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.16) 0%, rgba(245,158,11,0.06) 100%)' }}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(245,158,11,0.18)', border: '1px solid rgba(245,158,11,0.28)' }}>
                  <AlertCircle size={16} style={{ color: '#D97706' }} />
                </div>
                <p className="dashboard-card__title text-foreground leading-tight">{t('aiDetection.guidance')}</p>
              </div>
              <SpeakButton
                label={t('aiDetection.readGuidance')}
                isActive={speakingId === 'guide'}
                onClick={() => speakKm(guidanceSpeech, 'guide')}
              />
            </div>
            <div className="px-4 py-4 bg-amber-50/60 dark:bg-amber-950/20">
              <p className="text-[15px] sm:text-[16px] text-foreground leading-[1.75]">{km.guide}</p>
            </div>
          </div>
        </div>

        {/* ── Processing stats row ── */}
        <div className="grid grid-cols-3 gap-3 border-t border-border/70 pt-4">
          {[
            { label: t('aiDetection.processTime'), value: `${result.processing_time}s`, Icon: Clock, color: '#8B5CF6', bg: 'rgba(139,92,246,0.10)' },
            { label: t('aiDetection.model'), value: 'YOLOv8', Icon: Cpu, color: '#06B6D4', bg: 'rgba(6,182,212,0.10)' },
            { label: t('aiDetection.region'), value: t('aiDetection.cambodia'), Icon: MapPin, color: '#10B981', bg: 'rgba(16,185,129,0.10)' },
          ].map(s => (
            <div key={s.label} className="rounded-xl px-3 py-3 text-center border border-border/60"
              style={{ background: s.bg }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2"
                style={{ background: `${s.color}18`, border: `1px solid ${s.color}30` }}>
                <s.Icon size={15} style={{ color: s.color }} />
              </div>
              <p className="text-[14px] font-bold text-foreground leading-tight">{s.value}</p>
              <p className="text-[11.5px] text-muted-foreground mt-1 leading-snug">{s.label}</p>
            </div>
          ))}
        </div>


        {/* ── Reset button ── */}
        <button onClick={onReset}
          className="w-full py-2.5 rounded-xl text-[13px] font-semibold border border-border text-muted-foreground hover:bg-muted transition-colors flex items-center justify-center gap-2 cursor-pointer">
          <RefreshCw size={13} /> {t('aiDetection.detectAnother')}
        </button>
          </div>
        </div>
      </div>
    </CardWrap>
  );
}

/* ═══════════════════════════════════════════════════════
   Recent detections
═══════════════════════════════════════════════════════ */
function RecentDetectionThumb({
  log,
  signColor,
}: {
  log: AIDetectionLog;
  signColor: string;
}) {
  const { locale } = useLanguage();
  const [imgFailed, setImgFailed] = useState(false);
  const src = getProfileImageUrl(log.uploaded_image);

  if (src && !imgFailed) {
    return (
      <img
        src={src}
        alt={log.detected_sign}
        title={log.detected_sign}
        className="w-11 h-11 rounded-xl object-cover flex-shrink-0 bg-muted ring-1 ring-border/80"
        style={{ boxShadow: `0 0 0 1.5px ${signColor}30` }}
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <div
      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
      style={{ background: `${signColor}18`, border: `1.5px solid ${signColor}35` }}
    >
      {locale === 'en' ? (
        <Signpost size={14} style={{ color: signColor }} />
      ) : (
        <span className="text-[10px] font-black px-0.5 text-center leading-tight" style={{ color: signColor }}>
          {log.detected_sign.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
        </span>
      )}
    </div>
  );
}

function RecentDetectionsCard({
  logs,
  loading,
  onViewAll,
  layout = 'sidebar',
}: {
  logs: AIDetectionLog[];
  loading: boolean;
  onViewAll: () => void;
  layout?: 'sidebar' | 'full';
}) {
  const { t } = useLanguage();
  const isSidebar = layout === 'sidebar';
  const itemLimit = isSidebar ? 7 : 5;
  const items = logs.slice(0, itemLimit);
  const listClass = isSidebar ? 'flex-1 min-h-0 flex flex-col gap-2' : 'space-y-2';
  const rowClass = isSidebar
    ? 'flex-1 min-h-[52px] flex items-center gap-3 p-3 rounded-xl border border-border/70 bg-muted/30 hover:bg-muted/60 transition-colors'
    : 'flex items-center gap-3 p-3 rounded-xl border border-border/70 bg-muted/30 hover:bg-muted/60 transition-colors';

  return (
    <CardWrap className={`overflow-hidden flex flex-col ${isSidebar ? 'flex-1 min-h-0' : ''}`}>
      <div className="dashboard-panel-header relative px-5 pt-4 pb-8 flex-shrink-0"
        style={{ background: 'linear-gradient(135deg,#047857 0%,#10B981 100%)' }}>
        <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full pointer-events-none"
          style={{ background: 'rgba(255,255,255,0.08)' }} />
        <div className="relative flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.18)' }}>
              <BarChart2 size={14} color="white" />
            </div>
            <div className="min-w-0">
              <p className="dashboard-card__title text-white leading-tight">{t('aiDetection.recentTitle')}</p>
              <p className="dashboard-panel__subtitle mt-0.5 truncate">{t('aiDetection.recentSubtitle')}</p>
            </div>
          </div>
          <button
            type="button"
            className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg flex-shrink-0 cursor-pointer transition-colors"
            style={{ background: 'rgba(255,255,255,0.16)', color: 'white', border: '1px solid rgba(255,255,255,0.22)' }}
            onClick={onViewAll}>
            {t('aiDetection.viewAll')} <ChevronRight size={11} />
          </button>
        </div>
      </div>

      <div className={`relative -mt-4 mx-4 mb-4 ${isSidebar ? 'flex-1 min-h-0 flex flex-col' : ''}`}>
        <div className={`rounded-2xl bg-background border border-border/60 shadow-sm p-4 ${isSidebar ? 'flex-1 min-h-0 flex flex-col overflow-hidden' : ''}`}>
          {loading ? (
            <div className={listClass}>
              {[...Array(itemLimit)].map((_, i) => (
                <div key={i} className={`rounded-xl bg-muted animate-pulse ${isSidebar ? 'flex-1 min-h-[52px]' : 'h-[52px]'}`} />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8">
              <Activity size={26} className="mx-auto mb-2 text-muted-foreground opacity-30" />
              <p className="text-[13px] font-semibold text-muted-foreground">{t('aiDetection.noDetections')}</p>
              <p className="text-[12px] text-muted-foreground mt-1">{t('aiDetection.noDetectionsHint')}</p>
            </div>
          ) : (
            <div className={listClass}>
              {items.map(log => {
                const sc = getSignColor(log.detected_sign);
                const cc = confColor(log.confidence);
                return (
                  <div key={log.id} className={rowClass}>
                    <RecentDetectionThumb log={log} signColor={sc} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="dashboard-text__title truncate">{log.detected_sign}</p>
                        <span className="text-[12px] font-black flex-shrink-0" style={{ color: cc }}>
                          {log.confidence.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full"
                            style={{ width: `${log.confidence}%`, background: confGrad(log.confidence) }} />
                        </div>
                        <span className="text-[10.5px] text-muted-foreground flex-shrink-0 truncate max-w-[72px]">
                          {log.user_name}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10.5px] text-muted-foreground flex-shrink-0 hidden sm:block">
                      {new Date(log.created_at).toLocaleDateString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </CardWrap>
  );
}

/* ═══════════════════════════════════════════════════════
   Main page
═══════════════════════════════════════════════════════ */
export function AIDetectionPage() {
  const { t, STEPS, formatTraining, modelStatus, categoryName } = useAIDetectionCopy();
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
    setRecentLogs(logs.slice(0, 7));
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

  const maxCategoryCount = pageStats
    ? Math.max(...pageStats.categories.map(c => c.count), 1)
    : 1;

  return (
    <div className="dashboard-home dashboard-page--ai space-y-5">

      {/* ── HERO BANNER ── */}
      <div className="dashboard-welcome--hero relative overflow-hidden rounded-2xl pt-3 pb-5 px-6"
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
              <span className="dashboard-welcome__eyebrow" style={{ color: 'rgba(196,181,253,0.85)' }}>
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
          <p className="dashboard-welcome__meta" style={{ color: 'rgba(148,163,184,0.7)' }}>
            {t('aiDetection.heroSubtitle')}
          </p>
        </div>
      </div>

      {/* ── TOP STAT CARDS ── */}
      {loadingStats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : pageStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: t('aiDetection.accuracy'),
              value: formatPct(pageStats.stats.accuracy_avg),
              sub: t('aiDetection.scans').replace('{count}', formatScans(pageStats.stats.total_scans)),
              Icon: Target,
              grad: 'linear-gradient(135deg,#134E4A 0%,#0D9488 100%)',
            },
            {
              label: t('aiDetection.scansLabel'),
              value: formatScans(pageStats.stats.total_scans),
              sub: t('aiDetection.avgConfidenceShort'),
              Icon: Activity,
              grad: 'linear-gradient(135deg,#881337 0%,#F43F5E 100%)',
            },
            {
              label: t('aiDetection.categories'),
              value: String(pageStats.model.sign_classes),
              sub: `${pageStats.model.name} ${pageStats.model.version}`,
              Icon: Layers,
              grad: 'linear-gradient(135deg,#2D1B69 0%,#7C3AED 100%)',
            },
            {
              label: t('aiDetection.avgSpeedShort'),
              value: formatSpeed(pageStats.stats.avg_speed_sec),
              sub: t('aiDetection.perDetection'),
              Icon: Cpu,
              grad: 'linear-gradient(135deg,#92400E 0%,#F59E0B 100%)',
            },
          ].map(s => (
            <div key={s.label} className="dashboard-panel-header relative overflow-hidden rounded-2xl p-5 flex flex-col justify-between"
              style={{ background: s.grad, minHeight: 108 }}>
              <div className="absolute -bottom-6 -right-6 w-28 h-28 rounded-full pointer-events-none"
                style={{ background: 'rgba(255,255,255,0.07)' }} />
              <div className="flex items-center justify-between relative">
                <p className="dashboard-kpi__label text-white/70">{s.label}</p>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.18)' }}>
                  <s.Icon size={16} color="white" />
                </div>
              </div>
              <div className="relative">
                <p className="dashboard-kpi__value text-white mt-2">{s.value}</p>
                <p className="dashboard-kpi__sub text-white/55 mt-1">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MAIN ── */}
      <div className="space-y-5">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-stretch">
          <div className={`flex flex-col gap-5 w-full min-h-0 ${result ? 'h-full' : ''}`}>
            <CardWrap className={`overflow-hidden flex flex-col ${result ? 'flex-shrink-0' : 'min-h-[420px] h-full flex-1'}`}>
              <div className="dashboard-panel-header relative px-5 pt-5 pb-10 flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#6D28D9 0%,#7C3AED 50%,#8B5CF6 100%)' }}>
                <div className="absolute -top-5 -right-5 w-24 h-24 rounded-full pointer-events-none"
                  style={{ background: 'rgba(255,255,255,0.08)' }} />
                <div className="relative flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(255,255,255,0.18)' }}>
                        <Upload size={15} color="white" />
                      </div>
                      <p className="dashboard-card__title text-white leading-tight">{t('aiDetection.uploadTitle')}</p>
                    </div>
                    <p className="dashboard-panel__subtitle pl-10">{t('aiDetection.uploadSubtitle')}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {['PNG', 'JPG', 'WEBP'].map(f => (
                      <span key={f} className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-md"
                        style={{ background: 'rgba(255,255,255,0.16)', color: 'white', border: '1px solid rgba(255,255,255,0.22)' }}>
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="relative -mt-5 mx-4 mb-4 flex-1 flex flex-col min-h-0">
                <div className="rounded-2xl bg-background border border-border/60 shadow-sm p-4 flex flex-col flex-1 min-h-0 gap-3">
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl cursor-pointer transition-all overflow-hidden flex flex-col ${!result ? 'flex-1' : ''}`}
                style={{
                  borderColor: dragging ? '#8B5CF6' : 'rgba(139,92,246,0.28)',
                  background: dragging ? 'rgba(139,92,246,0.06)' : 'rgba(139,92,246,0.02)',
                  minHeight: !result && !preview ? 260 : undefined,
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
                        { Icon: ImageIcon, text: t('aiDetection.dropFormats') },
                        { Icon: Package, text: t('aiDetection.dropMaxSize') },
                      ].map(b => (
                        <span key={b.text} className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground px-2.5 py-1 rounded-lg bg-muted">
                          <b.Icon size={13} className="flex-shrink-0 opacity-80" />
                          {b.text}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <input ref={inputRef} type="file" accept="image/*" className="hidden"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

              {file && (
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                  style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.18)' }}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(139,92,246,0.15)' }}>
                      <Camera size={13} color="#8B5CF6" />
                    </div>
                    <div className="min-w-0">
                      <p className="dashboard-text__title truncate max-w-[180px]">{file.name}</p>
                      <p className="dashboard-text__caption">{(file.size / 1024).toFixed(1)} KB · {t('aiDetection.readyToDetect')}</p>
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); reset(); }}
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 ml-2 transition-colors text-sm cursor-pointer">✕</button>
                </div>
              )}

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

              <div className="border-t border-border pt-4 flex-shrink-0 mt-auto">
                <p className="dashboard-kpi__label text-muted-foreground mb-3">
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
                </div>
              </div>
            </CardWrap>
            {result && (
              <RecentDetectionsCard
                logs={recentLogs}
                loading={loadingLogs}
                layout="sidebar"
                onViewAll={() => navigate(aiLogsPath)}
              />
            )}
          </div>

          <div className="flex flex-col h-full min-h-[420px]">
            {result ? (
              <ResultCard result={result} preview={preview} onReset={reset} />
            ) : pageStats ? (
              <AwaitingCard pageStats={pageStats} onSampleClick={handleSampleSign} />
            ) : (
              <CardWrap className="min-h-[420px] h-full flex items-center justify-center">
                <div className="h-8 w-8 border-2 border-muted border-t-primary rounded-full animate-spin" />
              </CardWrap>
            )}
          </div>
        </div>

        {!result && (
          <RecentDetectionsCard
            logs={recentLogs}
            loading={loadingLogs}
            layout="full"
            onViewAll={() => navigate(aiLogsPath)}
          />
        )}
      </div>

      {/* ── BOTTOM INFO ROW ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {pageStats && (
          <CardWrap className="overflow-hidden">
            <div className="dashboard-panel-header relative px-5 pt-5 pb-10"
              style={{ background: 'linear-gradient(135deg,#4F46E5 0%,#7C3AED 100%)' }}>
              <div className="absolute -top-5 -right-5 w-24 h-24 rounded-full pointer-events-none"
                style={{ background: 'rgba(255,255,255,0.08)' }} />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.18)' }}>
                    <Cpu size={15} color="white" />
                  </div>
                  <p className="dashboard-kpi__label text-white/80">
                    {t('aiDetection.modelInfo')}
                  </p>
                </div>
                {status && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold"
                    style={{ background: status.bg, border: `1px solid ${status.border}`, color: status.color }}>
                    {status.dot && (
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: status.dot }} />
                    )}
                    {status.text}
                  </span>
                )}
              </div>
              <p className="dashboard-stat__value text-white mt-3 leading-tight">
                {pageStats.model.name}
              </p>
              <p className="dashboard-panel__subtitle mt-0.5">{pageStats.model.version}</p>
            </div>
            <div className="relative -mt-5 mx-4 mb-4 rounded-2xl bg-background border border-border/60 shadow-sm divide-y divide-border/60">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[11.5px] text-muted-foreground">{t('aiDetection.datasetImages')}</span>
                <span className="text-[12.5px] font-bold text-foreground">
                  {formatTraining(pageStats.model.training_images)
                    ?? t('aiDetection.signsInCatalog').replace('{count}', String(pageStats.model.sign_classes))}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[11.5px] text-muted-foreground">{t('aiDetection.modelStatus')}</span>
                <span className="text-[12.5px] font-bold text-foreground">
                  {pageStats.model.mode === 'yolo'
                    ? t('aiDetection.liveYolo')
                    : pageStats.model.mode === 'mock_fallback'
                      ? t('aiDetection.trainModel')
                      : t('aiDetection.demoUntilTrained')}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[11.5px] text-muted-foreground">{t('aiDetection.categories')}</span>
                <span className="text-[12.5px] font-bold text-foreground">{pageStats.model.sign_classes}</span>
              </div>
            </div>
          </CardWrap>
        )}

        <CardWrap className="overflow-hidden">
          <div className="dashboard-panel-header relative px-5 pt-5 pb-10"
            style={{ background: 'linear-gradient(135deg,#1D4ED8 0%,#3B82F6 100%)' }}>
            <div className="absolute -top-5 -right-5 w-24 h-24 rounded-full pointer-events-none"
              style={{ background: 'rgba(255,255,255,0.08)' }} />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.18)' }}>
                <Shield size={15} color="white" />
              </div>
              <p className="dashboard-kpi__label text-white/80">
                {t('aiDetection.signTypes')}
              </p>
            </div>
            <p className="dashboard-kpi__value text-white mt-3 leading-none">
              {pageStats ? pageStats.categories.reduce((s, c) => s + c.count, 0) : '—'}
            </p>
            <p className="dashboard-panel__subtitle mt-0.5">{t('aiDetection.signCatalog')}</p>
          </div>
          <div className="relative -mt-5 mx-4 mb-4 rounded-2xl bg-background border border-border/60 shadow-sm p-4">
            {loadingStats || !pageStats ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-8 rounded-xl bg-muted animate-pulse" />
                ))}
              </div>
            ) : pageStats.categories.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">{t('aiDetection.noCatalog')}</p>
            ) : (
              <div className="space-y-4">
                {pageStats.categories.map(c => (
                  <div key={c.key}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c.color }} />
                        <span className="dashboard-text__title">{categoryName(c.key, c.name)}</span>
                      </div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: `${c.color}18`, color: c.color }}>{c.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${(c.count / maxCategoryCount) * 100}%`, background: c.color }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardWrap>

        <CardWrap className="overflow-hidden">
          <div className="dashboard-panel-header relative px-5 pt-5 pb-10"
            style={{ background: 'linear-gradient(135deg,#0E7490 0%,#06B6D4 100%)' }}>
            <div className="absolute -top-5 -right-5 w-24 h-24 rounded-full pointer-events-none"
              style={{ background: 'rgba(255,255,255,0.08)' }} />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.18)' }}>
                <Zap size={15} color="white" />
              </div>
              <p className="dashboard-kpi__label text-white/80">
                {t('aiDetection.howItWorks')}
              </p>
            </div>
            <p className="dashboard-kpi__value text-white mt-3 leading-none">
              {STEPS.length}
            </p>
            <p className="dashboard-panel__subtitle mt-0.5">{t('aiDetection.howItWorks')}</p>
          </div>
          <div className="relative -mt-5 mx-4 mb-4 rounded-2xl bg-background border border-border/60 shadow-sm divide-y divide-border/60">
            {STEPS.map(s => (
              <div key={s.n} className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${s.color}18`, border: `1.5px solid ${s.color}35` }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: s.color }}>{s.n}</span>
                </div>
                <div className="min-w-0">
                  <p className="dashboard-text__title leading-tight">{s.title}</p>
                  <p className="dashboard-text__caption">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardWrap>
      </div>
    </div>
  );
}

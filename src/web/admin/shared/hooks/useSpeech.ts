import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { aiAPI } from '@shared/services/api';
import {
  heroSpeechText,
  khmerDominantText,
  resolveDetectionMode,
  textForTts,
} from '@shared/utils/detectionDisplay';

const KHMER_RE = /[\u1780-\u17FF]/;

function resolveSpeakLang(preferred?: 'en' | 'km', langOverride?: string): 'km' | 'en' {
  const override = (langOverride || '').toLowerCase();
  if (override.startsWith('en')) return 'en';
  if (override.startsWith('km')) return 'km';
  if (preferred === 'en') return 'en';
  if (preferred === 'km') return 'km';
  return 'en';
}

function pickBrowserVoice(lang: 'km' | 'en'): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (lang === 'km') {
    const kmVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('km'));
    const preferredNames = ['sreymom', 'piseth', 'khmer'];
    for (const token of preferredNames) {
      const hit = kmVoices.find((v) => v.name.toLowerCase().includes(token));
      if (hit) return hit;
    }
    return kmVoices.find((v) => !v.localService) || kmVoices[0] || null;
  }
  const enVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
  const preferredEn = ['jenny', 'aria', 'zira', 'samantha'];
  for (const token of preferredEn) {
    const hit = enVoices.find((v) => v.name.toLowerCase().includes(token));
    if (hit) return hit;
  }
  return enVoices.find((v) => !v.localService) || enVoices[0] || null;
}

const USE_SERVER_TTS =
  import.meta.env.VITE_USE_MOCK !== 'true' &&
  import.meta.env.VITE_SERVER_TTS !== 'false' &&
  import.meta.env.VITE_KHMER_SERVER_TTS !== 'false';

async function fetchNeuralSpeech(text: string, lang: 'km' | 'en'): Promise<Blob> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const blob = await aiAPI.speakText(text, lang);
      if (!blob || blob.size < 128) {
        throw new Error('Empty audio from server');
      }
      return blob;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < 1) {
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
    }
  }
  throw lastError ?? new Error('Voice failed');
}

export type SpeakOptions = {
  /** Auto-play after detection — falls back quietly if the browser blocks audio. */
  auto?: boolean;
};

export function useSpeech(preferredLocale?: 'en' | 'km') {
  const [speaking, setSpeaking] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const speakingRef = useRef(false);
  const speakingIdRef = useRef<string | null>(null);
  const speakGenRef = useRef(0);

  useEffect(() => {
    speakingRef.current = speaking;
    speakingIdRef.current = speakingId;
  }, [speaking, speakingId]);

  const cleanupAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current = null;
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    speakGenRef.current += 1;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    cleanupAudio();
    setSpeaking(false);
    setSpeakingId(null);
  }, [cleanupAudio]);

  const speakBrowser = useCallback(
    (text: string, id: string, lang: 'km' | 'en', silentError = false) => {
      if (!('speechSynthesis' in window)) return false;
      const utter = new SpeechSynthesisUtterance(text.trim());
      utter.lang = lang === 'km' ? 'km-KH' : 'en-US';
      const voice = pickBrowserVoice(lang);
      if (voice) utter.voice = voice;
      utter.rate = 0.92;
      utter.pitch = 1;
      utter.onend = () => {
        setSpeaking(false);
        setSpeakingId(null);
      };
      utter.onerror = () => {
        setSpeaking(false);
        setSpeakingId(null);
        if (!silentError) {
          toast.error('Browser voice could not speak this text.');
        }
      };
      setSpeakingId(id);
      setSpeaking(true);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
      return true;
    },
    [],
  );

  const speak = useCallback(
    async (text: string, id = 'default', langOverride?: string, options?: SpeakOptions) => {
      if (!text?.trim()) return;
      if (typeof window === 'undefined') {
        if (!options?.auto) toast.error('Voice is not available.');
        return;
      }

      if (speakingRef.current && speakingIdRef.current === id) {
        stop();
        return;
      }

      stop();

      const lang = resolveSpeakLang(preferredLocale, langOverride);
      const trimmed = textForTts(text, lang);
      if (!trimmed) return;

      const isAuto = Boolean(options?.auto);
      const generation = speakGenRef.current;

      const stale = () => generation !== speakGenRef.current;

      if (USE_SERVER_TTS) {
        try {
          const blob = await fetchNeuralSpeech(trimmed, lang);
          if (stale()) return;
          const url = URL.createObjectURL(blob);
          urlRef.current = url;
          const audio = new Audio(url);
          audioRef.current = audio;
          audio.onended = () => {
            if (stale()) return;
            cleanupAudio();
            setSpeaking(false);
            setSpeakingId(null);
          };
          audio.onerror = () => {
            if (stale()) return;
            cleanupAudio();
            setSpeaking(false);
            setSpeakingId(null);
            if (!isAuto) toast.error('Could not play audio.');
          };
          setSpeakingId(id);
          setSpeaking(true);
          try {
            await audio.play();
            if (stale()) {
              cleanupAudio();
              setSpeaking(false);
              setSpeakingId(null);
            }
          } catch {
            if (stale()) return;
            cleanupAudio();
            setSpeaking(false);
            setSpeakingId(null);
            if ('speechSynthesis' in window) {
              speakBrowser(trimmed, id, lang, isAuto);
              return;
            }
            if (!isAuto) {
              toast.error('Tap Listen to play voice (browser blocked auto-play).');
            }
          }
          return;
        } catch (err) {
          if (stale()) return;
          const msg = err instanceof Error ? err.message : 'Voice failed';
          if (lang === 'km') {
            if (!isAuto) {
              toast.error(
                msg.includes('503') || msg.includes('TTS')
                  ? 'Khmer voice unavailable. Install edge-tts on the server and check internet.'
                  : `Khmer voice failed: ${msg}`,
              );
            }
            if ('speechSynthesis' in window) {
              speakBrowser(trimmed, id, lang, isAuto);
            }
            return;
          }
          if (!('speechSynthesis' in window)) {
            if (!isAuto) toast.error(`English voice failed: ${msg}`);
            return;
          }
          if (!isAuto) {
            toast.message('Using browser voice (neural English unavailable).');
          }
          speakBrowser(trimmed, id, 'en', isAuto);
          return;
        }
      }

      if (!('speechSynthesis' in window)) {
        if (!isAuto) toast.error('Voice is not supported in this browser.');
        return;
      }
      if (lang === 'km' && !isAuto) {
        toast.error('Khmer neural voice requires the CamTraffic server (edge-tts).');
        return;
      }
      speakBrowser(trimmed, id, lang, isAuto);
    },
    [cleanupAudio, preferredLocale, speakBrowser, stop],
  );

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const warm = () => { window.speechSynthesis.getVoices(); };
      warm();
      window.speechSynthesis.addEventListener('voiceschanged', warm);
      return () => window.speechSynthesis.removeEventListener('voiceschanged', warm);
    }
    return undefined;
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { speak, stop, speaking, speakingId };
}

export function buildCatalogSignSpeech(
  sign: DetectionSpeechFields,
  locale: 'en' | 'km' = 'km',
) {
  const { name, desc, guide } = detectionDisplayText(sign, locale);
  return buildTrafficSignSpeech(name, desc, guide, locale);
}

export function buildTrafficSignSpeech(
  signName: string,
  description: string,
  guidance: string,
  locale: 'en' | 'km' = 'km',
) {
  if (locale === 'en') {
    return textForTts(
      `Traffic sign detected: ${signName}. ` +
      `${description} ` +
      `Please follow this traffic sign guidance: ${guidance}`,
      'en',
    );
  }
  return textForTts(
    `បានរកឃើញស្លាកចរាចរណ៍ ${signName}។ ` +
    `${description} ` +
    `សូមបញ្ជរកចរាចរតាមស្លាកចរាចរណ៍នេះ៖ ${guidance}`,
    'km',
  );
}

export function khmerSpeechText(result: {
  sign_name: string;
  sign_name_km?: string;
  sign_code?: string;
  category?: string;
  description: string;
  description_en?: string;
  guidance: string;
  guidance_en?: string;
}) {
  const code = result.sign_code || '';
  const name =
    (result.sign_name_km && KHMER_RE.test(result.sign_name_km)
      ? result.sign_name_km
      : null) ||
    (KHMER_RE.test(result.sign_name) ? result.sign_name : null) ||
    (code ? `ស្លាកចរាចរណ៍ ${code}` : result.sign_name);

  const desc = KHMER_RE.test(result.description)
    ? khmerDominantText(result.description)
    : `ស្លាកចរាចរណ៍ ${code || name}។ សូមគោរពច្បាប់ចរាចរណ៍កម្ពុជា និងបញ្ជរកចរាចរតាមស្លាកដែលបានរកឃើញ។`;

  const guide = KHMER_RE.test(result.guidance)
    ? khmerDominantText(result.guidance)
    : `សូមបញ្ជរកចរាចរតាមស្លាក ${name}។ រក្សាសុវត្ថិភាពចរាចរណ៍។`;

  return { name, desc, guide };
}

export type DetectionSpeechFields = {
  sign_name: string;
  sign_name_km?: string;
  sign_name_en?: string;
  sign_code?: string;
  category?: string;
  description: string;
  description_en?: string;
  guidance: string;
  guidance_en?: string;
  detection_mode?: 'sign' | 'vehicle' | 'plate' | 'no_sign';
  display_title?: string;
  display_title_en?: string;
  display_title_km?: string;
  display_confidence?: number;
  vehicles?: Array<{ vehicle_type: string; label: string; confidence: number }>;
  vehicle_count?: number;
};

export function detectionDisplayText(result: DetectionSpeechFields, locale: 'en' | 'km') {
  if (locale === 'en') {
    return {
      name: result.sign_name_en || result.sign_name,
      desc: result.description_en || result.description,
      guide: result.guidance_en || result.guidance,
    };
  }
  return khmerSpeechText(result);
}

export function detectionSpeechText(result: DetectionSpeechFields, locale: 'en' | 'km') {
  const mode = resolveDetectionMode(result);
  if (
    result.detection_mode
    || result.display_title
    || result.display_title_en
    || mode !== 'sign'
  ) {
    return heroSpeechText(result, locale);
  }
  const { name, desc, guide } = detectionDisplayText(result, locale);
  return buildTrafficSignSpeech(name, desc, guide, locale);
}

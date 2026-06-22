import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { aiAPI } from '@shared/services/api';
import { heroSpeechText, prepareKhmerTtsText, resolveDetectionMode } from '@shared/utils/detectionDisplay';

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
  const wantKm = lang === 'km';
  const ranked = voices.filter((v) => {
    const code = v.lang.toLowerCase();
    if (wantKm) return code.startsWith('km');
    return code.startsWith('en');
  });
  return ranked.find((v) => !v.localService) || ranked[0] || null;
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

export function useSpeech(preferredLocale?: 'en' | 'km') {
  const [speaking, setSpeaking] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

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
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    cleanupAudio();
    setSpeaking(false);
    setSpeakingId(null);
  }, [cleanupAudio]);

  const speakBrowser = useCallback(
    (text: string, id: string, lang: 'km' | 'en') => {
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
        toast.error('Browser voice could not speak this text.');
      };
      setSpeakingId(id);
      setSpeaking(true);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    },
    [],
  );

  const speak = useCallback(
    async (text: string, id = 'default', langOverride?: string) => {
      if (!text?.trim()) return;
      if (typeof window === 'undefined') {
        toast.error('Voice is not available.');
        return;
      }

      if (speaking && speakingId === id) {
        stop();
        return;
      }

      stop();

      const lang = resolveSpeakLang(preferredLocale, langOverride);
      const trimmed = lang === 'km' ? prepareKhmerTtsText(text) : text.trim();

      if (USE_SERVER_TTS) {
        try {
          const blob = await fetchNeuralSpeech(trimmed, lang);
          const url = URL.createObjectURL(blob);
          urlRef.current = url;
          const audio = new Audio(url);
          audioRef.current = audio;
          audio.onended = () => {
            cleanupAudio();
            setSpeaking(false);
            setSpeakingId(null);
          };
          audio.onerror = () => {
            cleanupAudio();
            setSpeaking(false);
            setSpeakingId(null);
            toast.error('Could not play audio.');
          };
          setSpeakingId(id);
          setSpeaking(true);
          await audio.play();
          return;
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Voice failed';
          if (lang === 'km') {
            toast.error(
              msg.includes('503') || msg.includes('TTS')
                ? 'Khmer voice unavailable. Install edge-tts on the server and check internet.'
                : `Khmer voice failed: ${msg}`,
            );
            return;
          }
          if (!('speechSynthesis' in window)) {
            toast.error(`English voice failed: ${msg}`);
            return;
          }
          toast.message('Using browser voice (neural English unavailable).');
          speakBrowser(trimmed, id, 'en');
          return;
        }
      }

      if (!('speechSynthesis' in window)) {
        toast.error('Voice is not supported in this browser.');
        return;
      }
      if (lang === 'km') {
        toast.error('Khmer neural voice requires the CamTraffic server (edge-tts).');
        return;
      }
      speakBrowser(trimmed, id, lang);
    },
    [cleanupAudio, preferredLocale, speakBrowser, speaking, speakingId, stop],
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
  if (locale === 'km') {
  return prepareKhmerTtsText(
    `បានរកឃើញស្លាកចរាចរណ៍ ${signName}។ ` +
    `${description} ` +
    `សូមបញ្ជរកចរាចរតាមស្លាកចរាចរណ៍នេះ៖ ${guidance}`,
  );
  }
  return (
    `Traffic sign detected: ${signName}. ` +
    `${description} ` +
    `Please follow this traffic sign guidance: ${guidance}`
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
    ? result.description
    : `ស្លាកចរាចរណ៍ ${code || name}។ សូមគោរពច្បាប់ចរាចរណ៍កម្ពុជា និងបញ្ជរកចរាចរតាមស្លាកដែលបានរកឃើញ។`;

  const guide = KHMER_RE.test(result.guidance)
    ? result.guidance
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

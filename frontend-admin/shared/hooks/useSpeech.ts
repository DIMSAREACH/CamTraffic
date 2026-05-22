import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { aiAPI } from '@shared/services/api';

function pickLang(text: string, preferred?: 'en' | 'km') {
  if (preferred === 'km') return 'km-KH';
  if (preferred === 'en') return 'en-US';
  return /[\u1780-\u17FF]/.test(text) ? 'km-KH' : 'en-US';
}

const USE_SERVER_KHMER =
  import.meta.env.VITE_USE_MOCK !== 'true' &&
  import.meta.env.VITE_KHMER_SERVER_TTS !== 'false';

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
    (text: string, id: string, langOverride?: string) => {
      const utter = new SpeechSynthesisUtterance(text.trim());
      utter.lang = langOverride || pickLang(text, preferredLocale);
      utter.rate = 0.92;
      utter.pitch = 1;
      utter.onend = () => {
        setSpeaking(false);
        setSpeakingId(null);
      };
      utter.onerror = () => {
        setSpeaking(false);
        setSpeakingId(null);
      };
      setSpeakingId(id);
      setSpeaking(true);
      window.speechSynthesis.speak(utter);
    },
    [preferredLocale],
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

      const wantKhmer =
        langOverride === 'km-KH' || preferredLocale === 'km' || /[\u1780-\u17FF]/.test(text);

      if (wantKhmer && USE_SERVER_KHMER) {
        try {
          const blob = await aiAPI.speakKhmer(text.trim());
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
            toast.error('Could not play Khmer audio.');
          };
          setSpeakingId(id);
          setSpeaking(true);
          await audio.play();
          return;
        } catch {
          /* fall back to browser voice */
        }
      }

      if (!('speechSynthesis' in window)) {
        toast.error('Voice is not supported in this browser.');
        return;
      }
      speakBrowser(text, id, langOverride);
    },
    [cleanupAudio, preferredLocale, speakBrowser, speaking, speakingId, stop],
  );

  useEffect(() => () => stop(), [stop]);

  return { speak, stop, speaking, speakingId };
}

export function buildTrafficSignSpeech(
  signName: string,
  description: string,
  guidance: string,
  locale: 'en' | 'km' = 'km',
) {
  if (locale === 'km') {
    return (
      `បានរកឃើញស្លាកចរាចរណ៍ ${signName}។ ` +
      `${description} ` +
      `សូមបញ្ជរកចរាចរតាមស្លាកចរាចរណ៍នេះ៖ ${guidance}`
    );
  }
  return (
    `Traffic sign detected: ${signName}. ` +
    `${description} ` +
    `Please follow this traffic sign guidance: ${guidance}`
  );
}

const KHMER_RE = /[\u1780-\u17FF]/;

/** Khmer text for TTS on any traffic sign (API or local fallback). */
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

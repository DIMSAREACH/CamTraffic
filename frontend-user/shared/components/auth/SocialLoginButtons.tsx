import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { authAPI } from '@shared/services/api';
import { useLanguage } from '@shared/context/LanguageContext';

type SocialLoginButtonsProps = {
  variant?: 'user' | 'admin';
};

type OAuthStatus = {
  google: boolean;
  github: boolean;
};

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.05-.02-2.06-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.35-1.76-1.35-1.76-1.1-.75.08-.74.08-.74 1.22.09 1.86 1.25 1.86 1.25 1.08 1.85 2.83 1.32 3.52 1.01.11-.78.42-1.32.76-1.62-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.17 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02.01 2.05.14 3 .4 2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.87.12 3.17.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.49 5.92.43.37.81 1.1.81 2.22 0 1.61-.01 2.9-.01 3.29 0 .32.22.69.83.58A12.01 12.01 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

const CALLBACK_PATH = '/auth/oauth/callback';

export function SocialLoginButtons({ variant = 'user' }: SocialLoginButtonsProps) {
  const { t } = useLanguage();
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'github' | null>(null);
  const [status, setStatus] = useState<OAuthStatus | null>(null);
  const gridClass = variant === 'admin' ? 'social-grid social-grid--admin' : 'social-grid';

  useEffect(() => {
    let cancelled = false;
    authAPI
      .getOAuthStatus()
      .then((next) => {
        if (!cancelled) setStatus(next);
      })
      .catch(() => {
        if (!cancelled) setStatus({ google: false, github: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const startOAuth = async (provider: 'google' | 'github') => {
    if (status && !status[provider]) {
      toast.error(t('auth.oauthNotConfigured'));
      return;
    }
    const redirectUri = `${window.location.origin}${CALLBACK_PATH}`;
    setLoadingProvider(provider);
    try {
      const data = await authAPI.getOAuthAuthorizeUrl(provider, redirectUri);
      const effectiveRedirect = data.redirect_uri || redirectUri;
      sessionStorage.setItem('oauth_provider', provider);
      sessionStorage.setItem('oauth_redirect_uri', effectiveRedirect);
      // GitHub uses a single registered callback — open authorize only after landing host matches.
      if (provider === 'github' && effectiveRedirect !== redirectUri) {
        const targetOrigin = new URL(effectiveRedirect).origin;
        if (window.location.origin !== targetOrigin) {
          toast.error(`Continue GitHub sign-in on ${targetOrigin}`);
          window.location.assign(`${targetOrigin}/`);
          return;
        }
      }
      window.location.assign(data.authorization_url);
    } catch (err: unknown) {
      setLoadingProvider(null);
      toast.error(err instanceof Error ? err.message : t('auth.oauthStartFailed'));
    }
  };

  // Hide social block entirely when neither provider is configured (typical local demo).
  if (status && !status.google && !status.github) {
    return null;
  }

  const showGoogle = !status || status.google;
  const showGithub = !status || status.github;

  return (
    <div className="social-login-block">
      <div className="or-divider">
        <span>{t('auth.orContinueWith')}</span>
      </div>
      <div className={gridClass}>
        {showGoogle && (
          <button
            type="button"
            className="social-btn social-google"
            onClick={() => startOAuth('google')}
            disabled={loadingProvider !== null}
            aria-label={t('auth.signInWithGoogle')}
          >
            {loadingProvider === 'google' ? <Loader2 size={18} className="animate-spin" /> : <GoogleIcon />}
            <span>Google</span>
          </button>
        )}
        {showGithub && (
          <button
            type="button"
            className="social-btn social-github"
            onClick={() => startOAuth('github')}
            disabled={loadingProvider !== null}
            aria-label={t('auth.signInWithGithub')}
          >
            {loadingProvider === 'github' ? <Loader2 size={18} className="animate-spin" /> : <GithubIcon />}
            <span>GitHub</span>
          </button>
        )}
      </div>
    </div>
  );
}

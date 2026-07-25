import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Loader2, AlertCircle } from 'lucide-react';
import { AuthPageBackground } from '@shared/components/auth/AuthPageBackground';
import { useAuth } from '@shared/context/AuthContext';
import { authAPI } from '@shared/services/api';
import { getAdminDevUrl, getUserDevUrl } from '@shared/utils/portal';

const IS_ADMIN_SURFACE = import.meta.env.VITE_PORTAL_SURFACE === 'admin';

export function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [error, setError] = useState('');
  const handled = useRef(false);

  useEffect(() => {
    document.title = 'Signing in · CamTraffic';
  }, []);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const oauthError = searchParams.get('error');
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (oauthError) {
      setError('Sign-in was cancelled or denied. Please try again.');
      return;
    }
    if (!code || !state) {
      setError('Missing authorization data. Please try again from the login page.');
      return;
    }

    const provider = sessionStorage.getItem('oauth_provider');
    if (!provider || (provider !== 'google' && provider !== 'github')) {
      setError('Sign-in session expired. Please try again from the login page.');
      return;
    }

    const redirectUri =
      sessionStorage.getItem('oauth_redirect_uri') ||
      `${window.location.origin}/auth/oauth/callback`;

    (async () => {
      try {
        const response = await authAPI.completeOAuth(
          provider,
          code,
          state,
          IS_ADMIN_SURFACE ? 'admin' : 'user',
          redirectUri,
        );
        setSession(response, true);
        sessionStorage.removeItem('oauth_provider');
        sessionStorage.removeItem('oauth_redirect_uri');

        if (response.user.role === 'admin') {
          if (IS_ADMIN_SURFACE) {
            navigate('/admin/dashboard', { replace: true });
          } else {
            window.location.assign(getAdminDevUrl('/admin/dashboard'));
          }
          return;
        }
        const home = response.user.role === 'driver' ? '/citizen' : '/officer';
        if (IS_ADMIN_SURFACE) {
          window.location.assign(getUserDevUrl(home));
        } else {
          navigate(home, { replace: true });
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Social sign-in failed.');
      }
    })();
  }, [navigate, searchParams, setSession]);

  return (
    <div className="up-page up-page--user" style={{ alignItems: 'center', justifyContent: 'center', display: 'flex' }}>
      <AuthPageBackground />
      <div className="up-overlay" />
      <div
        className="up-card"
        style={{
          position: 'relative',
          zIndex: 2,
          maxWidth: 420,
          width: '100%',
          margin: '2rem',
          padding: '2rem',
          textAlign: 'center',
        }}
      >
        {error ? (
          <>
            <AlertCircle size={40} color="#ef4444" style={{ marginBottom: '1rem' }} />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.5rem' }}>Sign-in failed</h2>
            <p style={{ color: '#6b7280', marginBottom: '1.25rem', lineHeight: 1.5 }}>{error}</p>
            <button type="button" className="btn-submit" onClick={() => navigate('/', { replace: true })}>
              Back to login
            </button>
          </>
        ) : (
          <>
            <Loader2
              size={40}
              className="animate-spin"
              style={{ margin: '0 auto 1rem', color: '#7c3aed' }}
            />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Completing sign-in…</h2>
            <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>Please wait a moment.</p>
          </>
        )}
      </div>
    </div>
  );
}

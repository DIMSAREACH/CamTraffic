import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { authAPI } from '@shared/services/api';
import { useLanguage } from '@shared/context/LanguageContext';
import { EmailVerificationPanel } from '@shared/components/auth/EmailVerificationPanel';

export function VerifyEmailPage() {
  const { t } = useLanguage();
  const [params] = useSearchParams();
  const uid = params.get('uid') || '';
  const token = params.get('token') || '';
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>(uid && token ? 'loading' : 'idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!uid || !token) return;
    authAPI.confirmEmailVerification(uid, token)
      .then((res) => {
        setStatus('ok');
        setMessage(res.message || t('verifyEmail.confirmed'));
      })
      .catch((err: unknown) => {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : t('verifyEmail.confirmFailed'));
      });
  }, [uid, token, t]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
      <div className="w-full max-w-md space-y-4">
        <h1 className="text-xl font-bold text-white text-center">{t('verifyEmail.pageTitle')}</h1>

        {status === 'loading' && (
          <div className="enforcement-page__panel p-6 flex items-center justify-center gap-2">
            <Loader2 className="animate-spin" size={20} />
            <span>{t('verifyEmail.confirming')}</span>
          </div>
        )}

        {status === 'ok' && (
          <div className="enforcement-page__panel p-6 flex flex-col items-center gap-3 text-emerald-600">
            <CheckCircle size={32} />
            <p>{message}</p>
            <Link to="/" className="text-violet-600 hover:underline">{t('verifyEmail.backToLogin')}</Link>
          </div>
        )}

        {status === 'error' && (
          <div className="enforcement-page__panel p-6 flex flex-col items-center gap-3 text-red-600">
            <XCircle size={32} />
            <p>{message}</p>
          </div>
        )}

        {(status === 'idle' || status === 'error') && !uid && (
          <EmailVerificationPanel />
        )}
      </div>
    </div>
  );
}

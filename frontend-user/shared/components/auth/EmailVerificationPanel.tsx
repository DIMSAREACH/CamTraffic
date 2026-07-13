import { useState } from 'react';
import { Mail, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { authAPI } from '@shared/services/api';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { toast } from 'sonner';

export function EmailVerificationPanel() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [sending, setSending] = useState(false);

  if (!user) return null;

  if (user.email_verified) {
    return (
      <section className="enforcement-page__panel p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div
            className="enforcement-page__dialog-icon"
            style={{ background: 'rgba(16,185,129,0.12)', color: '#059669' }}
          >
            <Mail size={16} aria-hidden />
          </div>
          <h2 className="font-semibold text-lg">{t('verifyEmail.title')}</h2>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40 p-4 flex gap-3 items-start">
          <CheckCircle size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden />
          <div className="min-w-0">
            <p className="font-medium text-emerald-800 dark:text-emerald-300">{t('verifyEmail.alreadyVerified')}</p>
            <p className="text-sm text-emerald-700/80 dark:text-emerald-400/80 mt-1 break-all">{user.email}</p>
          </div>
        </div>
      </section>
    );
  }

  const handleSend = async () => {
    setSending(true);
    try {
      const res = await authAPI.sendEmailVerification();
      toast.success(res.message || t('verifyEmail.sent'));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('verifyEmail.sendFailed'));
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="enforcement-page__panel p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div
          className="enforcement-page__dialog-icon"
          style={{ background: 'rgba(139,92,246,0.12)', color: '#7C3AED' }}
        >
          <Mail size={16} aria-hidden />
        </div>
        <h2 className="font-semibold text-lg">{t('verifyEmail.title')}</h2>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('verifyEmail.description')}</p>
      <p className="text-sm font-medium break-all">{user.email}</p>
      <Button type="button" onClick={handleSend} disabled={sending}>
        {sending ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
        {t('verifyEmail.resend')}
      </Button>
    </section>
  );
}

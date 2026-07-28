import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowLeft,
  Calculator,
  Camera,
  CheckCircle,
  Clock,
  CreditCard,
  Download,
  FileText,
  MapPin,
  AlertTriangle,
  Car,
  Shield,
  ImageOff,
} from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { formatAppCurrency, formatAppDate } from '@shared/i18n/localeFormat';
import { CITIZEN_PORTAL_ROUTES, getPortalRoutesForRole } from '@shared/constants/portalRoutes';
import { finesAPI } from '@shared/services/api';
import { getProfileImageUrl } from '@shared/utils/profileImage';
import { humanizeApiError } from '@shared/utils/apiErrors';
import type { Fine } from '@shared/types';
import { toast } from 'sonner';

function statusTone(status: Fine['status']): string {
  switch (status) {
    case 'overdue':
      return 'is-overdue';
    case 'paid':
      return 'is-paid';
    case 'disputed':
      return 'is-disputed';
    case 'dismissed':
      return 'is-muted';
    case 'awaiting_verification':
      return 'is-amber';
    default:
      return 'is-pending';
  }
}

/** Strip duplicated enforcement prefix from stored reason text. */
function cleanViolationTitle(reason: string | null | undefined, rulePrefix: string, fallback: string): string {
  const raw = (reason || '').trim();
  if (!raw) return fallback;
  const prefix = rulePrefix.trim();
  if (!prefix) return raw;

  let next = raw;
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^(?:${escaped}\\s*:\\s*)+`, 'i');
  next = next.replace(re, '').trim();
  return next || fallback;
}

export default function FineDetailPage() {
  const { fineId } = useParams<{ fineId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, locale } = useLanguage();
  const portalRoutes =
    user?.role === 'police' || user?.role === 'driver'
      ? getPortalRoutesForRole(user.role)
      : CITIZEN_PORTAL_ROUTES;
  const isOfficer = user?.role === 'police';

  const [fine, setFine] = useState<Fine | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [evidenceBroken, setEvidenceBroken] = useState(false);

  const load = useCallback(async () => {
    if (!fineId || !user) return;
    setLoading(true);
    try {
      const data = await finesAPI.getById(fineId);
      setFine(data);
      setEvidenceBroken(false);
    } catch (err) {
      toast.error(err instanceof Error ? humanizeApiError(err.message) : 'Request failed');
      navigate(portalRoutes.fines);
    } finally {
      setLoading(false);
    }
  }, [fineId, user, navigate, portalRoutes.fines]);

  useEffect(() => {
    void load();
  }, [load]);

  const downloadReceipt = async (includeEvidence = false) => {
    if (!fineId) return;
    setDownloading(true);
    try {
      const blob = await finesAPI.downloadReceiptPdf(fineId, includeEvidence);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fine_receipt_${fineId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success(t('fines.receiptDownloaded') || 'Receipt downloaded');
    } catch (err) {
      toast.error(err instanceof Error ? humanizeApiError(err.message) : 'Request failed');
    } finally {
      setDownloading(false);
    }
  };

  const violationTitle = useMemo(() => {
    if (!fine) return '';
    return cleanViolationTitle(
      fine.reason,
      t('fines.rulePrefix'),
      t('fines.untitled') || 'Traffic violation',
    );
  }, [fine, t]);

  if (loading) {
    return (
      <div className="fine-detail-page fine-detail-page--loading">
        <div className="fine-detail-page__spinner" />
      </div>
    );
  }

  if (!fine) {
    return (
      <div className="fine-detail-page fine-detail-page--empty">
        <FileText className="fine-detail-page__empty-icon" />
        <p className="fine-detail-page__empty-title">{t('fines.notFound') || 'Fine not found'}</p>
        <Button onClick={() => navigate(portalRoutes.fines)}>
          {t('fines.backToFines') || 'Back to fines'}
        </Button>
      </div>
    );
  }

  const unpaid = fine.status === 'pending' || fine.status === 'overdue' || fine.status === 'awaiting_verification';
  const evidenceUrl = getProfileImageUrl(fine.evidence_image) || fine.evidence_image || null;
  const showEvidence = Boolean(evidenceUrl) && !evidenceBroken;
  const statusLabel = t(`fines.status.${fine.status}`) !== `fines.status.${fine.status}`
    ? t(`fines.status.${fine.status}`)
    : fine.status.replace(/_/g, ' ');

  const facts = [
    {
      key: 'location',
      label: t('fines.colLocation') || 'Location',
      value: fine.location || '—',
      icon: MapPin,
      tone: 'blue' as const,
    },
    {
      key: 'issued',
      label: t('fines.issued') || 'Issued',
      value: formatAppDate(locale, fine.created_at),
      icon: Clock,
      tone: 'slate' as const,
    },
    {
      key: 'plate',
      label: t('fines.colPlate') || 'Vehicle',
      value: fine.vehicle_plate || '—',
      icon: Car,
      tone: 'teal' as const,
      mono: true,
    },
    {
      key: 'officer',
      label: t('fines.colOfficer') || 'Officer',
      value: fine.police_name || '—',
      icon: Shield,
      tone: 'indigo' as const,
    },
  ];

  return (
    <div className="fine-detail-page">
      <div className="fine-detail-page__nav">
        <button
          type="button"
          className="fine-detail-page__back"
          onClick={() => navigate(portalRoutes.fines)}
        >
          <ArrowLeft size={18} />
          {t('common.back') || 'Back'}
        </button>
        <span className={`fine-detail-page__status-badge ${statusTone(fine.status)}`}>
          {statusLabel}
        </span>
      </div>

      <article className="fine-detail-page__card">
        <header className="fine-detail-page__hero">
          <p className="fine-detail-page__eyebrow">{t('fines.rulePrefix')}</p>
          <h1 className="fine-detail-page__title">{violationTitle}</h1>
          <div className="fine-detail-page__amount-block">
            <span className="fine-detail-page__amount-label">{t('fines.amountDue') || 'Amount due'}</span>
            <p className={`fine-detail-page__amount ${fine.status === 'overdue' ? 'is-overdue' : ''}`}>
              {formatAppCurrency(locale, Number(fine.amount))}
            </p>
          </div>
        </header>

        <div className="fine-detail-page__grid">
          {facts.map((fact) => {
            const Icon = fact.icon;
            return (
              <div key={fact.key} className={`fine-detail-page__fact fine-detail-page__fact--${fact.tone}`}>
                <span className={`fine-detail-page__fact-icon fine-detail-page__fact-icon--${fact.tone}`}>
                  <Icon size={16} />
                </span>
                <div className="fine-detail-page__fact-copy">
                  <p className="fine-detail-page__fact-label">{fact.label}</p>
                  <p className={`fine-detail-page__fact-value${fact.mono ? ' is-mono' : ''}`}>{fact.value}</p>
                </div>
              </div>
            );
          })}
        </div>

        {fine.status === 'overdue' ? (
          <div className="fine-detail-page__alert fine-detail-page__alert--danger">
            <AlertTriangle size={18} />
            <span>{t('fines.overdueAlert')}</span>
          </div>
        ) : null}

        {fine.status === 'paid' ? (
          <div className="fine-detail-page__alert fine-detail-page__alert--success">
            <CheckCircle size={18} />
            <div>
              <strong>{t('fines.paymentConfirmed') || 'Payment confirmed'}</strong>
              <p>
                {fine.paid_at ? formatAppDate(locale, fine.paid_at) : '—'}
                {fine.payment_method ? ` · ${fine.payment_method}` : ''}
                {fine.payment_reference ? ` · Ref ${fine.payment_reference}` : ''}
              </p>
            </div>
          </div>
        ) : null}

        {fine.status === 'pending' || fine.status === 'awaiting_verification' ? (
          <div className="fine-detail-page__alert fine-detail-page__alert--info">
            <Clock size={18} />
            <span>
              {fine.status === 'awaiting_verification'
                ? (t('fines.awaitingVerificationHint') || 'Payment is awaiting officer verification.')
                : (t('fines.pendingAlert') || 'Please pay this fine before the due date.')}
            </span>
          </div>
        ) : null}

        <div className="fine-detail-page__evidence">
          <div className="fine-detail-page__evidence-head">
            <Camera size={15} />
            <span>{t('fines.evidence') || 'Evidence'}</span>
          </div>
          {showEvidence ? (
            <a href={evidenceUrl!} target="_blank" rel="noreferrer" className="fine-detail-page__evidence-link">
              <img
                src={evidenceUrl!}
                alt={t('fines.evidence') || 'Evidence'}
                className="fine-detail-page__evidence-img"
                onError={() => setEvidenceBroken(true)}
              />
            </a>
          ) : (
            <div className="fine-detail-page__evidence-empty">
              <ImageOff size={20} />
              <span>{t('fines.noEvidence') || 'No evidence image attached'}</span>
            </div>
          )}
        </div>
      </article>

      <div className="fine-detail-page__actions">
        {!isOfficer && unpaid ? (
          <button
            type="button"
            className="fine-detail-page__btn-primary"
            onClick={() => navigate(`${portalRoutes.fines}/${fine.id}/payment`)}
          >
            <CreditCard size={20} />
            {t('fines.payFine') || 'Pay fine'}
          </button>
        ) : (
          <button
            type="button"
            className="fine-detail-page__btn-primary fine-detail-page__btn-primary--ghost"
            onClick={() => navigate(portalRoutes.fines)}
          >
            {t('fines.backToFines') || 'Back to fines'}
          </button>
        )}

        <div className="fine-detail-page__actions-secondary">
          <button
            type="button"
            className="fine-detail-page__btn-secondary"
            disabled={downloading}
            onClick={() => void downloadReceipt(false)}
          >
            <Download size={17} />
            {downloading ? (t('fines.generating') || 'Generating…') : (t('fines.downloadPdf') || 'Download PDF receipt')}
          </button>
          {!isOfficer && fine.status !== 'paid' && fine.violation_id ? (
            <button
              type="button"
              className="fine-detail-page__btn-secondary"
              onClick={() => navigate(`${portalRoutes.appeals}?violationId=${fine.violation_id}&fineId=${fine.id}`)}
            >
              <FileText size={17} />
              {t('fines.submitAppeal') || 'Submit appeal'}
            </button>
          ) : null}
          {!isOfficer && unpaid && Number(fine.amount) >= 50 ? (
            <button
              type="button"
              className="fine-detail-page__btn-secondary"
              onClick={() => navigate(`${portalRoutes.fines}/${fine.id}/installments`)}
            >
              <Calculator size={17} />
              {t('fines.paymentPlan') || 'Payment plan'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

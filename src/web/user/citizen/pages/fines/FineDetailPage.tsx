import { useCallback, useEffect, useState } from 'react';
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
} from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { formatAppCurrency, formatAppDate } from '@shared/i18n/localeFormat';
import { CITIZEN_PORTAL_ROUTES, getPortalRoutesForRole } from '@shared/constants/portalRoutes';
import { finesAPI } from '@shared/services/api';
import { humanizeApiError } from '@shared/utils/apiErrors';
import type { Fine } from '@shared/types';
import { toast } from 'sonner';

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

  const load = useCallback(async () => {
    if (!fineId || !user) return;
    setLoading(true);
    try {
      const data = await finesAPI.getById(fineId);
      setFine(data);
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

  if (loading) {
    return (
      <div className="flex min-h-72 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
      </div>
    );
  }

  if (!fine) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <FileText className="mx-auto mb-3 h-10 w-10 text-slate-400" />
        <p className="font-medium text-slate-800">Fine not found</p>
        <Button className="mt-4" onClick={() => navigate(portalRoutes.fines)}>
          Back to fines
        </Button>
      </div>
    );
  }

  const unpaid = fine.status === 'pending' || fine.status === 'overdue' || fine.status === 'awaiting_verification';

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(portalRoutes.fines)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium capitalize text-slate-700">
          {fine.status.replace('_', ' ')}
        </span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">{fine.reason}</h1>
        <p className="mt-2 text-3xl font-bold text-emerald-700">
          {formatAppCurrency(locale, Number(fine.amount))}
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="flex gap-2 text-sm">
            <MapPin className="mt-0.5 h-4 w-4 text-slate-500" />
            <div>
              <p className="text-slate-500">Location</p>
              <p className="font-medium text-slate-800">{fine.location}</p>
            </div>
          </div>
          <div className="flex gap-2 text-sm">
            <Clock className="mt-0.5 h-4 w-4 text-slate-500" />
            <div>
              <p className="text-slate-500">Issued</p>
              <p className="font-medium text-slate-800">{formatAppDate(locale, fine.created_at)}</p>
            </div>
          </div>
          <div className="text-sm">
            <p className="text-slate-500">Vehicle</p>
            <p className="font-mono font-medium text-slate-800">{fine.vehicle_plate || '—'}</p>
          </div>
          <div className="text-sm">
            <p className="text-slate-500">Officer</p>
            <p className="font-medium text-slate-800">{fine.police_name || '—'}</p>
          </div>
        </div>

        {fine.status === 'paid' && (
          <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center gap-2 font-medium text-emerald-800">
              <CheckCircle className="h-4 w-4" />
              Payment confirmed
            </div>
            <p className="mt-1 text-sm text-emerald-700">
              {fine.paid_at ? formatAppDate(locale, fine.paid_at) : '—'}
              {fine.payment_method ? ` · ${fine.payment_method}` : ''}
              {fine.payment_reference ? ` · Ref ${fine.payment_reference}` : ''}
            </p>
          </div>
        )}

        {fine.status === 'overdue' && (
          <div className="mt-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            This fine is overdue. Pay now to avoid additional penalties.
          </div>
        )}

        {fine.evidence_image ? (
          <div className="mt-6">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
              <Camera className="h-4 w-4" />
              Evidence
            </div>
            <img
              src={fine.evidence_image}
              alt="Fine evidence"
              className="max-h-80 w-full rounded-lg object-cover"
            />
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          variant="outline"
          disabled={downloading}
          onClick={() => void downloadReceipt(false)}
          className="justify-start"
        >
          <Download className="mr-2 h-4 w-4" />
          {downloading ? 'Generating…' : 'Download PDF receipt'}
        </Button>
        {fine.evidence_image ? (
          <Button
            variant="outline"
            disabled={downloading}
            onClick={() => void downloadReceipt(true)}
            className="justify-start"
          >
            <Download className="mr-2 h-4 w-4" />
            Receipt + evidence
          </Button>
        ) : null}

        {!isOfficer && unpaid ? (
          <>
            <Button
              className="justify-start"
              onClick={() => navigate(`${portalRoutes.fines}/${fine.id}/payment`)}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Pay fine
            </Button>
            {Number(fine.amount) >= 50 ? (
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => navigate(`${portalRoutes.fines}/${fine.id}/installments`)}
              >
                <Calculator className="mr-2 h-4 w-4" />
                Payment plan
              </Button>
            ) : null}
          </>
        ) : null}

        {!isOfficer && fine.status !== 'paid' && fine.violation_id ? (
          <Button
            variant="outline"
            className="justify-start"
            onClick={() => navigate(`${portalRoutes.appeals}?violationId=${fine.violation_id}`)}
          >
            <FileText className="mr-2 h-4 w-4" />
            Submit appeal
          </Button>
        ) : null}
      </div>
    </div>
  );
}

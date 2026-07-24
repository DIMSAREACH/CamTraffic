import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowLeft,
  Calculator,
  CheckCircle,
  CreditCard,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Label } from '@shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { formatAppCurrency, formatAppDate } from '@shared/i18n/localeFormat';
import { CITIZEN_PORTAL_ROUTES } from '@shared/constants/portalRoutes';
import { finesAPI } from '@shared/services/api';
import { humanizeApiError } from '@shared/utils/apiErrors';
import type { Fine } from '@shared/types';
import { toast } from 'sonner';

type Quote = {
  original_amount: number;
  num_installments: number;
  installment_amount: number;
  interest_rate: number;
  total_interest: number;
  setup_fee: number;
  total_amount: number;
};

type Plan = {
  id: string;
  fine_id: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  num_installments: number;
  status: string;
  start_date: string;
  end_date: string;
};

type Payment = {
  id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  status: string;
  paid_at?: string;
  late_fee: number;
  days_overdue: number;
};

export default function InstallmentPlanPage() {
  const { fineId } = useParams<{ fineId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { locale } = useLanguage();

  const [fine, setFine] = useState<Fine | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [numInstallments, setNumInstallments] = useState('6');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!fineId || !user) return;
    setLoading(true);
    try {
      const fineData = await finesAPI.getById(fineId);
      setFine(fineData);
      try {
        const planData = await finesAPI.getInstallmentPlan(fineId);
        setPlan(planData.plan);
        setPayments(planData.payments || []);
      } catch {
        setPlan(null);
        setPayments([]);
      }
    } catch (err) {
      toast.error(err instanceof Error ? humanizeApiError(err.message) : 'Request failed');
      navigate(CITIZEN_PORTAL_ROUTES.fines);
    } finally {
      setLoading(false);
    }
  }, [fineId, user, navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  const calculateQuote = async () => {
    if (!fineId) return;
    setBusy(true);
    try {
      const data = await finesAPI.getInstallmentQuote(fineId, Number(numInstallments));
      setQuote(data.quote);
    } catch (err) {
      toast.error(err instanceof Error ? humanizeApiError(err.message) : 'Request failed');
    } finally {
      setBusy(false);
    }
  };

  const createPlan = async () => {
    if (!fineId) return;
    setBusy(true);
    try {
      await finesAPI.createInstallmentPlan(fineId, Number(numInstallments), 1);
      toast.success('Payment plan created');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? humanizeApiError(err.message) : 'Request failed');
    } finally {
      setBusy(false);
    }
  };

  const payInstallment = async (payment: Payment) => {
    setBusy(true);
    try {
      await finesAPI.payInstallment(payment.id, {
        amount: Number(payment.amount) + Number(payment.late_fee || 0),
        payment_method: 'khqr',
        payment_reference: `INST-${Date.now()}`,
      });
      toast.success('Installment paid');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? humanizeApiError(err.message) : 'Request failed');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-72 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
      </div>
    );
  }

  if (!fine) return null;

  const amount = Number(fine.amount);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(`${CITIZEN_PORTAL_ROUTES.fines}/${fineId}`)}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to fine
      </Button>

      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
          <Calculator className="h-5 w-5" />
          Payment installment plan
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {fine.reason} · {formatAppCurrency(locale, amount)}
        </p>
      </div>

      {plan ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-lg font-bold">{formatAppCurrency(locale, Number(plan.total_amount))}</p>
                <p className="text-xs text-slate-500">Total</p>
              </div>
              <div>
                <p className="text-lg font-bold text-emerald-700">{formatAppCurrency(locale, Number(plan.paid_amount))}</p>
                <p className="text-xs text-slate-500">Paid</p>
              </div>
              <div>
                <p className="text-lg font-bold text-amber-700">{formatAppCurrency(locale, Number(plan.remaining_amount))}</p>
                <p className="text-xs text-slate-500">Remaining</p>
              </div>
            </div>
            <p className="mt-4 text-center text-sm capitalize text-slate-600">Status: {plan.status}</p>
          </div>

          <div className="space-y-3">
            {payments.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4"
              >
                <div>
                  <p className="font-medium">Payment #{p.installment_number}</p>
                  <p className="text-sm text-slate-500">
                    Due {formatAppDate(locale, p.due_date)}
                    {p.paid_at ? ` · Paid ${formatAppDate(locale, p.paid_at)}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">
                    {formatAppCurrency(locale, Number(p.amount) + Number(p.late_fee || 0))}
                  </span>
                  {p.status === 'paid' ? (
                    <span className="inline-flex items-center gap-1 text-sm text-emerald-700">
                      <CheckCircle className="h-4 w-4" /> Paid
                    </span>
                  ) : (
                    <Button size="sm" disabled={busy} onClick={() => void payInstallment(p)}>
                      <CreditCard className="mr-1 h-4 w-4" />
                      Pay
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : amount < 50 ? (
        <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Payment plans are available for fines of {formatAppCurrency(locale, 50)} or more.
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <div>
            <Label>Number of installments</Label>
            <Select value={numInstallments} onValueChange={setNumInstallments}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 months</SelectItem>
                <SelectItem value="6">6 months</SelectItem>
                <SelectItem value="9">9 months</SelectItem>
                <SelectItem value="12">12 months</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button disabled={busy} onClick={() => void calculateQuote()} className="w-full">
            Calculate plan
          </Button>

          {quote ? (
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <div className="flex justify-between text-sm">
                <span>Base amount</span>
                <span>{formatAppCurrency(locale, quote.original_amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Interest ({quote.interest_rate}%)</span>
                <span>{formatAppCurrency(locale, quote.total_interest)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Setup fee</span>
                <span>{formatAppCurrency(locale, quote.setup_fee)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{formatAppCurrency(locale, quote.total_amount)}</span>
              </div>
              <div className="rounded-lg bg-slate-50 p-4 text-center">
                <p className="text-sm text-slate-500">Monthly payment</p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatAppCurrency(locale, quote.installment_amount)}
                </p>
              </div>
              <Button disabled={busy} onClick={() => void createPlan()} className="w-full">
                Create payment plan
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, PlusCircle, Banknote, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { api } from '../lib/api';
import { useLang } from '../lib/i18n';
import { fmtCurrency } from '../lib/utils';
import { Modal } from '../components/ui/modal';
import { Button } from '../components/ui/button';

// --- Types ---
interface DueRow { id: number; installment_number: number; due_date: string; due_amount: number; paid_amount: number; status: string; paid_date?: string; }
interface PlanRow { id: number; description: string; total_amount: number; down_payment: number; paid_amount: number; remaining_amount: number; number_of_installments: number; start_date: string; status: string; notes?: string; installment_dues: DueRow[]; }
interface PaymentRow { id: number; amount: number; payment_date: string; payment_method: string; notes?: string; }
interface SaleRow { id: number; date: string; total_amount: number; paid_amount: number; pending_amount: number; status: string; items_summary: string; }
interface CustomerSummary { total_purchased: number; total_paid: number; remaining_balance: number; overdue_amount: number; overdue_installments: number; }
interface CustomerInfo { id: number; name: string; phone: string; address: string; customer_type: string; credit_limit: number; payment_term_days: number; }
interface DetailData { customer: CustomerInfo; summary: CustomerSummary; installment_plans: PlanRow[]; payment_history: PaymentRow[]; purchase_history: SaleRow[]; }

const DUE_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-industrial-100 text-industrial-600',
  partial: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
};

const PLAN_STATUS_COLORS: Record<string, string> = {
  active: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-industrial-100 text-industrial-500',
};

// ─── New Plan Modal ───────────────────────────────────────────────────────────

function NewPlanModal({ customerId, onClose, onCreated }: { customerId: number; onClose: () => void; onCreated: () => void }) {
  const { t } = useLang();
  const [form, setForm] = useState({ total_amount: '', down_payment: '0', number_of_installments: '6', start_date: new Date().toISOString().slice(0, 10), description: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const total = parseFloat(form.total_amount) || 0;
  const down = parseFloat(form.down_payment) || 0;
  const n = parseInt(form.number_of_installments) || 1;
  const remaining = Math.max(0, total - down);
  const monthly = n > 0 ? remaining / n : 0;

  const preview: { no: number; date: string; amount: number }[] = [];
  for (let i = 0; i < n && i < 12; i++) {
    const d = new Date(form.start_date);
    d.setMonth(d.getMonth() + i);
    preview.push({ no: i + 1, date: d.toISOString().slice(0, 10), amount: monthly });
  }

  const submit = async () => {
    if (!total || n < 1) { setError('Please fill required fields'); return; }
    setLoading(true);
    try {
      await api.post(`/customers/${customerId}/credit-plan`, {
        total_amount: total,
        down_payment: down,
        number_of_installments: n,
        start_date: form.start_date,
        description: form.description,
        notes: form.notes,
      });
      onCreated();
    } catch {
      setError('Failed to create plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open title={t.newInstallmentPlan} onClose={onClose}>
      <div className="space-y-4">
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs text-industrial-500">{t.planDescription}</span>
            <input className="mt-1 w-full rounded border border-industrial-200 px-3 py-2 text-sm" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </label>
          <label className="block">
            <span className="text-xs text-industrial-500">{t.startDate}</span>
            <input type="date" className="mt-1 w-full rounded border border-industrial-200 px-3 py-2 text-sm" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
          </label>
          <label className="block">
            <span className="text-xs text-industrial-500">{t.totalAmountPlan} *</span>
            <input type="number" className="mt-1 w-full rounded border border-industrial-200 px-3 py-2 text-sm" value={form.total_amount} onChange={e => setForm(f => ({ ...f, total_amount: e.target.value }))} />
          </label>
          <label className="block">
            <span className="text-xs text-industrial-500">{t.downPayment}</span>
            <input type="number" className="mt-1 w-full rounded border border-industrial-200 px-3 py-2 text-sm" value={form.down_payment} onChange={e => setForm(f => ({ ...f, down_payment: e.target.value }))} />
          </label>
          <label className="block">
            <span className="text-xs text-industrial-500">{t.numInstallments} *</span>
            <input type="number" min={1} max={60} className="mt-1 w-full rounded border border-industrial-200 px-3 py-2 text-sm" value={form.number_of_installments} onChange={e => setForm(f => ({ ...f, number_of_installments: e.target.value }))} />
          </label>
          <div className="flex items-end pb-2">
            <span className="text-xs text-industrial-500">{t.monthlyInstallment}:{' '}
              <span className="font-bold text-industrial-800">{fmtCurrency(monthly)}</span>
            </span>
          </div>
        </div>

        {/* Preview table */}
        {preview.length > 0 && (
          <div>
            <p className="text-xs font-medium text-industrial-600 mb-2">{t.installmentPreview}</p>
            <div className="max-h-48 overflow-y-auto rounded border border-industrial-100">
              <table className="w-full text-xs">
                <thead className="bg-industrial-50 text-industrial-500">
                  <tr>
                    <th className="px-3 py-1.5 text-left">{t.installmentNo}</th>
                    <th className="px-3 py-1.5 text-left">{t.dueOn}</th>
                    <th className="px-3 py-1.5 text-right">{t.dueAmount}</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map(row => (
                    <tr key={row.no} className="border-t border-industrial-100">
                      <td className="px-3 py-1.5">{row.no}</td>
                      <td className="px-3 py-1.5">{row.date}</td>
                      <td className="px-3 py-1.5 text-right">{fmtCurrency(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>{t.cancel}</Button>
          <Button onClick={submit} disabled={loading}>{loading ? t.loading : t.createPlan}</Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Record Payment Modal ─────────────────────────────────────────────────────

function RecordPaymentModal({ customerId, plans, onClose, onCreated }: { customerId: number; plans: PlanRow[]; onClose: () => void; onCreated: () => void }) {
  const { t } = useLang();
  const [form, setForm] = useState({ amount: '', payment_date: new Date().toISOString().slice(0, 10), payment_method: 'cash', installment_plan_id: '', installment_due_id: '', cheque_number: '', bank_name: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const activePlans = plans.filter(p => p.status !== 'cancelled' && p.status !== 'completed');
  const selectedPlan = activePlans.find(p => p.id === parseInt(form.installment_plan_id));
  const pendingDues = selectedPlan?.installment_dues.filter(d => d.status !== 'paid') ?? [];

  const submit = async () => {
    if (!form.amount) { setError('Amount required'); return; }
    setLoading(true);
    try {
      await api.post(`/customers/${customerId}/record-payment`, {
        amount: parseFloat(form.amount),
        payment_date: form.payment_date,
        payment_method: form.payment_method,
        installment_plan_id: form.installment_plan_id ? parseInt(form.installment_plan_id) : undefined,
        installment_due_id: form.installment_due_id ? parseInt(form.installment_due_id) : undefined,
        cheque_number: form.cheque_number || undefined,
        bank_name: form.bank_name || undefined,
        notes: form.notes || undefined,
      });
      onCreated();
    } catch {
      setError('Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open title={t.recordPaymentBtn} onClose={onClose}>
      <div className="space-y-5">
        {error && (
          <div className="rounded-lg bg-red-50 border-2 border-red-200 px-4 py-3 flex items-center gap-2">
            <span className="text-sm font-semibold text-red-700">{error}</span>
          </div>
        )}
        
        <div className="rounded-xl bg-industrial-50 border-2 border-industrial-200 p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-industrial-800 mb-2">
                Amount <span className="text-red-600">*</span>
              </label>
              <input 
                type="number" 
                className="w-full h-12 rounded-lg border-2 border-industrial-300 bg-white px-4 text-base font-medium focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 focus:outline-none transition-all" 
                placeholder="Enter amount" 
                value={form.amount} 
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} 
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-industrial-800 mb-2">Payment Date</label>
              <input 
                type="date" 
                className="w-full h-12 rounded-lg border-2 border-industrial-300 bg-white px-4 text-base font-medium focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 focus:outline-none transition-all" 
                value={form.payment_date} 
                onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))} 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-industrial-800 mb-2">Payment Method</label>
            <select 
              className="w-full h-12 rounded-lg border-2 border-industrial-300 bg-white px-4 text-base font-medium focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 focus:outline-none cursor-pointer transition-all" 
              value={form.payment_method} 
              onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}>
              <option value="cash">💵 Cash</option>
              <option value="bank_transfer">🏦 Bank Transfer</option>
              <option value="cheque">📝 Cheque</option>
              <option value="jazzcash">📱 JazzCash</option>
              <option value="easypaisa">💳 Easypaisa</option>
            </select>
          </div>
          
          {form.payment_method === 'cheque' && (
            <div>
              <label className="block text-sm font-bold text-industrial-800 mb-2">Cheque Number</label>
              <input 
                className="w-full h-12 rounded-lg border-2 border-industrial-300 bg-white px-4 text-base font-medium focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 focus:outline-none transition-all" 
                placeholder="Enter cheque number" 
                value={form.cheque_number} 
                onChange={e => setForm(f => ({ ...f, cheque_number: e.target.value }))} 
              />
            </div>
          )}
          
          {form.payment_method === 'bank_transfer' && (
            <div>
              <label className="block text-sm font-bold text-industrial-800 mb-2">Bank Name</label>
              <input 
                className="w-full h-12 rounded-lg border-2 border-industrial-300 bg-white px-4 text-base font-medium focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 focus:outline-none transition-all" 
                placeholder="Enter bank name" 
                value={form.bank_name} 
                onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} 
              />
            </div>
          )}
        </div>

        {/* Apply to credit plan */}
        {activePlans.length > 0 && (
          <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-5 space-y-4">
            <p className="text-sm font-bold text-blue-900 flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              Apply to Credit Plan (Optional)
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-bold text-industrial-800 mb-2">Select Plan</label>
                <select 
                  className="w-full h-12 rounded-lg border-2 border-industrial-300 bg-white px-4 text-base font-medium focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 focus:outline-none cursor-pointer transition-all" 
                  value={form.installment_plan_id} 
                  onChange={e => setForm(f => ({ ...f, installment_plan_id: e.target.value, installment_due_id: '' }))}>
                  <option value="">— General Payment —</option>
                  {activePlans.map(p => (
                    <option key={p.id} value={p.id}>{p.description || `Plan #${p.id}`} ({fmtCurrency(p.remaining_amount)} remaining)</option>
                  ))}
                </select>
              </div>
              {selectedPlan && pendingDues.length > 0 && (
                <div>
                  <label className="block text-sm font-bold text-industrial-800 mb-2">Select Payment Due</label>
                  <select 
                    className="w-full h-12 rounded-lg border-2 border-industrial-300 bg-white px-4 text-base font-medium focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 focus:outline-none cursor-pointer transition-all" 
                    value={form.installment_due_id} 
                    onChange={e => setForm(f => ({ ...f, installment_due_id: e.target.value }))}>
                    <option value="">— Auto (oldest first) —</option>
                    {pendingDues.map(d => (
                      <option key={d.id} value={d.id}>#{d.installment_number} · {d.due_date} · {fmtCurrency(d.due_amount - d.paid_amount)}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="rounded-xl bg-industrial-50 border-2 border-industrial-200 p-5">
          <label className="block text-sm font-bold text-industrial-800 mb-2">Notes (Optional)</label>
          <textarea 
            rows={3}
            className="w-full rounded-lg border-2 border-industrial-300 bg-white px-4 py-3 text-base font-medium focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 focus:outline-none resize-none transition-all" 
            placeholder="Add any additional notes here..." 
            value={form.notes} 
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} 
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="px-8 h-11 font-semibold">{t.cancel}</Button>
          <Button onClick={submit} disabled={loading} className="px-10 h-11 font-semibold shadow-lg">
            {loading ? '⏳ Processing...' : '✓ Submit Payment'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── CustomerDetail page ──────────────────────────────────────────────────────

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, isUrdu } = useLang();

  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'plans' | 'payments' | 'purchases'>('plans');
  const [showNewPlan, setShowNewPlan] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data: detail } = await api.get<DetailData>(`/customers/${id}/ledger-detail`);
      setData(detail);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return <div className="p-10 text-center text-industrial-400">{t.loading}</div>;
  if (!data) return <div className="p-10 text-center text-red-400">Customer not found</div>;

  const { customer, summary, installment_plans, payment_history, purchase_history } = data;

  const statCards = [
    { label: t.totalPurchased, value: fmtCurrency(summary.total_purchased), color: 'bg-blue-50 text-blue-700' },
    { label: t.totalPaidLabel, value: fmtCurrency(summary.total_paid), color: 'bg-green-50 text-green-700' },
    { label: t.remainingBalance, value: fmtCurrency(summary.remaining_balance), color: 'bg-yellow-50 text-yellow-700' },
    { label: t.overdueAmt, value: fmtCurrency(summary.overdue_amount), color: 'bg-red-50 text-red-700' },
  ];

  return (
    <div className={`p-6 space-y-6 ${isUrdu ? 'font-urdu' : ''}`}>
      {/* Back + header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/customers')} className="flex items-center gap-1 text-sm text-industrial-500 hover:text-industrial-700">
          <ArrowLeft className="h-4 w-4" /> {t.backToCustomers}
        </button>
      </div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-industrial-900">{customer.name}</h1>
          {customer.phone && <p className="text-sm text-industrial-500 mt-0.5">{customer.phone}</p>}
          {customer.address && <p className="text-sm text-industrial-400">{customer.address}</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowPayment(true)}>
            <Banknote className="h-4 w-4 mr-1" /> {t.recordPaymentBtn}
          </Button>
          <Button size="sm" onClick={() => setShowNewPlan(true)}>
            <PlusCircle className="h-4 w-4 mr-1" /> {t.newInstallmentPlan}
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map(card => (
          <div key={card.label} className={`rounded-xl p-4 ${card.color} border border-industrial-100`}>
            <p className="text-xs opacity-70">{card.label}</p>
            <p className="text-lg font-bold mt-0.5">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-industrial-200">
        {(['plans', 'payments', 'purchases'] as const).map(tabKey => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey)}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${tab === tabKey ? 'border-industrial-600 text-industrial-700' : 'border-transparent text-industrial-500 hover:text-industrial-700'}`}
          >
            {tabKey === 'plans' ? t.activeInstallmentPlans : tabKey === 'payments' ? t.paymentHistory : t.purchaseHistory}
            <span className="ml-1.5 rounded-full bg-industrial-100 px-1.5 py-0.5 text-xs">
              {tabKey === 'plans' ? installment_plans.length : tabKey === 'payments' ? payment_history.length : purchase_history.length}
            </span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'plans' && (
        <div className="space-y-4">
          {installment_plans.length === 0 && <p className="text-industrial-400 text-sm">{t.noData}</p>}
          {installment_plans.map(plan => (
            <div key={plan.id} className="rounded-xl border border-industrial-100 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 bg-industrial-50">
                <div>
                  <span className="font-semibold text-industrial-800">{plan.description || `Plan #${plan.id}`}</span>
                  <span className="ml-2 text-xs text-industrial-400">({plan.start_date})</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-industrial-600">
                    {fmtCurrency(plan.paid_amount)} / {fmtCurrency(plan.total_amount)}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PLAN_STATUS_COLORS[plan.status] ?? 'bg-industrial-100'}`}>
                    {plan.status === 'active' ? t.activePlan : plan.status === 'completed' ? t.completedPlan : plan.status === 'overdue' ? t.overduePlan : t.cancelledPlan}
                  </span>
                </div>
              </div>
              {/* Progress bar */}
              <div className="px-5 py-2">
                <div className="h-1.5 rounded-full bg-industrial-100 overflow-hidden">
                  <div
                    className="h-1.5 rounded-full bg-green-500"
                    style={{ width: `${plan.total_amount > 0 ? Math.min(100, (plan.paid_amount / plan.total_amount) * 100) : 0}%` }}
                  />
                </div>
              </div>
              {/* Dues table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-industrial-50/50 text-industrial-500">
                    <tr>
                      <th className="px-4 py-2 text-left">{t.installmentNo}</th>
                      <th className="px-4 py-2 text-left">{t.dueOn}</th>
                      <th className="px-4 py-2 text-right">{t.dueAmount}</th>
                      <th className="px-4 py-2 text-right">{t.paidAmount}</th>
                      <th className="px-4 py-2 text-center">{t.planStatus}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.installment_dues.map(due => (
                      <tr key={due.id} className="border-t border-industrial-100">
                        <td className="px-4 py-2">{due.installment_number}</td>
                        <td className="px-4 py-2">{due.due_date}</td>
                        <td className="px-4 py-2 text-right">{fmtCurrency(due.due_amount)}</td>
                        <td className="px-4 py-2 text-right">{fmtCurrency(due.paid_amount)}</td>
                        <td className="px-4 py-2 text-center">
                          <span className={`rounded-full px-2 py-0.5 font-medium ${DUE_STATUS_COLORS[due.status] ?? 'bg-industrial-100'}`}>
                            {due.status === 'paid' ? <CheckCircle2 className="inline h-3.5 w-3.5 text-green-600" /> : due.status === 'overdue' ? <AlertCircle className="inline h-3.5 w-3.5 text-red-500" /> : <Clock className="inline h-3.5 w-3.5 text-industrial-400" />}
                            {' '}{due.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'payments' && (
        <div className="overflow-x-auto rounded-xl border border-industrial-100">
          <table className="w-full text-sm">
            <thead className="bg-industrial-50 text-industrial-500 text-xs">
              <tr>
                <th className="px-4 py-3 text-left">{t.paymentDate}</th>
                <th className="px-4 py-3 text-right">{t.paymentAmount}</th>
                <th className="px-4 py-3 text-left">{t.paymentMethod}</th>
                <th className="px-4 py-3 text-left">{t.notes}</th>
              </tr>
            </thead>
            <tbody>
              {payment_history.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-industrial-400">{t.noData}</td></tr>
              )}
              {payment_history.map(p => (
                <tr key={p.id} className="border-t border-industrial-100 hover:bg-industrial-50/50">
                  <td className="px-4 py-3">{p.payment_date}</td>
                  <td className="px-4 py-3 text-right font-medium text-green-700">{fmtCurrency(p.amount)}</td>
                  <td className="px-4 py-3 capitalize">{p.payment_method}</td>
                  <td className="px-4 py-3 text-industrial-400">{p.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'purchases' && (
        <div className="overflow-x-auto rounded-xl border border-industrial-100">
          <table className="w-full text-sm">
            <thead className="bg-industrial-50 text-industrial-500 text-xs">
              <tr>
                <th className="px-4 py-3 text-left">{t.saleDate}</th>
                <th className="px-4 py-3 text-left">{t.itemsSummary}</th>
                <th className="px-4 py-3 text-right">{t.totalAmount}</th>
                <th className="px-4 py-3 text-right">{t.paid}</th>
                <th className="px-4 py-3 text-right">{t.pendingAmount}</th>
                <th className="px-4 py-3 text-center">{t.status}</th>
              </tr>
            </thead>
            <tbody>
              {purchase_history.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-industrial-400">{t.noData}</td></tr>
              )}
              {purchase_history.map((s: SaleRow) => (
                <tr key={s.id} className="border-t border-industrial-100 hover:bg-industrial-50/50">
                  <td className="px-4 py-3">{s.date?.slice(0, 10)}</td>
                  <td className="px-4 py-3 text-industrial-500 max-w-xs truncate">{s.items_summary}</td>
                  <td className="px-4 py-3 text-right">{fmtCurrency(s.total_amount)}</td>
                  <td className="px-4 py-3 text-right text-green-700">{fmtCurrency(s.paid_amount)}</td>
                  <td className="px-4 py-3 text-right text-yellow-600">{fmtCurrency(s.pending_amount)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.status === 'paid' ? 'bg-green-100 text-green-700' : s.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNewPlan && (
        <NewPlanModal
          customerId={parseInt(id!)}
          onClose={() => setShowNewPlan(false)}
          onCreated={() => { setShowNewPlan(false); load(); }}
        />
      )}
      {showPayment && (
        <RecordPaymentModal
          customerId={parseInt(id!)}
          plans={installment_plans}
          onClose={() => setShowPayment(false)}
          onCreated={() => { setShowPayment(false); load(); }}
        />
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, PlusCircle, Banknote, CheckCircle2, AlertCircle, Clock, Paperclip, Upload, Trash2, Download, Eye, ImageIcon } from 'lucide-react';
import { api } from '../lib/api';
import { useLang } from '../lib/i18n';
import { fmtCurrency } from '../lib/utils';
import { Modal } from '../components/ui/modal';
import { Button } from '../components/ui/button';
import { AddPreviousCreditModal } from '../components/AddPreviousCreditModal';

// --- Types ---
interface DueRow { id: number; installment_number: number; due_date: string; due_amount: number; paid_amount: number; status: string; paid_date?: string; }
interface PlanRow { id: number; description: string; total_amount: number; down_payment: number; paid_amount: number; remaining_amount: number; number_of_installments: number; start_date: string; status: string; notes?: string; installment_dues: DueRow[]; }
interface PaymentRow { id: number; amount: number; payment_date: string; payment_method: string; notes?: string; }
interface SaleRow { id: number; date: string; total_amount: number; paid_amount: number; pending_amount: number; status: string; items_summary: string; source?: 'sale' | 'manual'; notes?: string; }
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

// ─── PreviewModal ─────────────────────────────────────────────────────────────

function PreviewModal({ att, onClose, onDownload }: { att: any; onClose: () => void; onDownload: (att: any) => void }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  useEffect(() => {
    let revoked = false;
    api.get(`/attachments/${att.id}/file`, { responseType: 'blob' }).then(res => {
      if (!revoked) setBlobUrl(URL.createObjectURL(res.data));
    }).catch(() => {});
    return () => { revoked = true; if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [att.id]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85" onClick={onClose}>
      <div className="relative max-h-[92vh] max-w-[92vw]" onClick={e => e.stopPropagation()}>
        {blobUrl ? (
          <img src={blobUrl} alt={att.originalName} className="max-h-[85vh] max-w-[85vw] rounded-2xl object-contain shadow-2xl" />
        ) : (
          <div className="flex h-48 w-48 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          </div>
        )}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between rounded-t-2xl bg-black/60 px-4 py-2.5">
          <p className="truncate text-sm font-semibold text-white">{att.originalName}</p>
          <div className="flex items-center gap-2 ml-4 shrink-0">
            <button onClick={() => onDownload(att)} className="rounded-lg bg-white/20 p-2 text-white hover:bg-white/30 transition-colors"><Download className="h-4 w-4" /></button>
            <button onClick={onClose} className="rounded-lg bg-white/20 px-3 py-1.5 text-sm font-bold text-white hover:bg-white/30 transition-colors">✕</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── AttachmentCard ───────────────────────────────────────────────────────────
function AttachmentCard({ att, isImage, onPreview, onDownload, onDelete }: {
  att: any; isImage: boolean;
  onPreview: (att: any) => void;
  onDownload: (att: any) => void;
  onDelete: (id: number) => void;
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isImage) return;
    let revoked = false;
    api.get(`/attachments/${att.id}/file`, { responseType: 'blob' }).then(res => {
      if (!revoked) setBlobUrl(URL.createObjectURL(res.data));
    }).catch(() => {});
    return () => { revoked = true; if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [att.id, isImage]);

  const fileEmoji = att.mimetype === 'application/pdf' ? '📄' : att.mimetype?.includes('word') ? '📝' : att.mimetype?.includes('sheet') || att.mimetype?.includes('excel') ? '📊' : '📎';
  const sizeFmt = att.size < 1024 * 1024 ? `${(att.size / 1024).toFixed(0)} KB` : `${(att.size / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <div className="group relative flex flex-col rounded-xl border-2 border-industrial-200 bg-white overflow-hidden shadow-sm hover:border-accent-primary hover:shadow-md transition-all">
      {/* Thumbnail */}
      <div className="flex h-36 items-center justify-center bg-industrial-50 overflow-hidden">
        {isImage && blobUrl ? (
          <img src={blobUrl} alt={att.originalName} className="h-full w-full object-cover" />
        ) : isImage ? (
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-industrial-200 border-t-accent-primary" />
        ) : (
          <span className="text-5xl select-none">{fileEmoji}</span>
        )}
      </div>

      {/* Hover overlay actions */}
      <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
        {isImage && (
          <button onClick={() => onPreview(att)} className="rounded-full bg-white/90 p-2.5 text-industrial-900 hover:bg-white transition-colors" title="Preview">
            <Eye className="h-4 w-4" />
          </button>
        )}
        <button onClick={() => onDownload(att)} className="rounded-full bg-white/90 p-2.5 text-industrial-900 hover:bg-white transition-colors" title="Download">
          <Download className="h-4 w-4" />
        </button>
        <button onClick={() => onDelete(att.id)} className="rounded-full bg-red-500/90 p-2.5 text-white hover:bg-red-600 transition-colors" title="Delete">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* File info */}
      <div className="px-3 py-2 border-t border-industrial-100">
        <p className="truncate text-xs font-semibold text-industrial-800">{att.originalName}</p>
        <p className="text-xs text-industrial-400 mt-0.5">{sizeFmt} · {new Date(att.createdAt).toLocaleDateString()}</p>
      </div>
    </div>
  );
}

// ─── CustomerDetail page ──────────────────────────────────────────────────────

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, isUrdu } = useLang();

  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'purchases' | 'attachments'>('purchases');
  const [showNewPlan, setShowNewPlan] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showManualCredit, setShowManualCredit] = useState(false);

  // Attachments state
  const [attachments, setAttachments] = useState<any[]>([]);
  const [attUploading, setAttUploading] = useState(false);
  const [attError, setAttError] = useState('');
  const [attDragging, setAttDragging] = useState(false);
  const [previewAtt, setPreviewAtt] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data: detail } = await api.get<DetailData>(`/customers/${id}/ledger-detail`);
      setData(detail);
    } finally {
      setLoading(false);
    }
  };

  const loadAttachments = async () => {
    try {
      const { data } = await api.get('/attachments', { params: { entityType: 'customer', entityId: id } });
      setAttachments(data);
    } catch { setAttachments([]); }
  };

  const uploadFile = async (file: File) => {
    setAttError('');
    setAttUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.post('/attachments', formData, {
        params: { entityType: 'customer', entityId: id },
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await loadAttachments();
    } catch (err: any) {
      setAttError(err?.response?.data?.message ?? 'Upload failed');
    } finally {
      setAttUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const deleteAttachment = async (attId: number) => {
    if (!window.confirm('Delete this attachment?')) return;
    try {
      await api.delete(`/attachments/${attId}`);
      setAttachments(prev => prev.filter(a => a.id !== attId));
    } catch { /* ignore */ }
  };

  const downloadAttachment = async (att: any) => {
    try {
      const response = await api.get(`/attachments/${att.id}/file`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url; a.download = att.originalName; a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  };

  useEffect(() => { load(); }, [id]);
  useEffect(() => { if (tab === 'attachments') loadAttachments(); }, [tab, id]);

  if (loading) return <div className="p-10 text-center text-industrial-400">{t.loading}</div>;
  if (!data) return <div className="p-10 text-center text-red-400">Customer not found</div>;

  const { customer, summary, installment_plans, payment_history, purchase_history } = data;

  const totalSalesPending = purchase_history.reduce((sum: number, s: SaleRow) => sum + Number(s.pending_amount || 0), 0);

  const statCards = [
    { label: t.totalPurchased, value: fmtCurrency(summary.total_purchased), color: 'bg-blue-50 text-blue-700' },
    { label: t.totalPaidLabel, value: fmtCurrency(summary.total_paid), color: 'bg-green-50 text-green-700' },
    { label: t.remainingBalance, value: fmtCurrency(summary.remaining_balance), color: 'bg-yellow-50 text-yellow-700' },
    { label: t.overdueAmt, value: fmtCurrency(summary.overdue_amount), color: 'bg-red-50 text-red-700' },
    { label: isUrdu ? 'واجب الادا (خریداری)' : 'Sales Pending', value: fmtCurrency(totalSalesPending), color: totalSalesPending > 0 ? 'bg-orange-50 text-orange-700' : 'bg-industrial-50 text-industrial-500' },
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
          {summary.remaining_balance > 0 && (
            <Button size="sm" onClick={() => setShowPayment(true)}>
              <Banknote className="h-4 w-4 mr-1" /> Collect Payment
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowManualCredit(true)}>
            <PlusCircle className="h-4 w-4 mr-1" /> Add Previous Credit
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {statCards.map(card => (
          <div key={card.label} className={`rounded-xl p-4 ${card.color} border border-industrial-100`}>
            <p className="text-xs opacity-70">{card.label}</p>
            <p className="text-lg font-bold mt-0.5">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-industrial-200">
        {(['purchases', 'attachments'] as const).map(tabKey => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey)}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${tab === tabKey ? 'border-industrial-600 text-industrial-700' : 'border-transparent text-industrial-500 hover:text-industrial-700'}`}
          >
            {tabKey === 'purchases' ? t.purchaseHistory : (
              <span className="flex items-center gap-1.5"><Paperclip className="h-3.5 w-3.5" />Receipts & Docs</span>
            )}
            {tabKey === 'purchases' && (
              <span className="ml-1.5 rounded-full bg-industrial-100 px-1.5 py-0.5 text-xs">
                {purchase_history.length}
              </span>
            )}
            {tabKey === 'attachments' && attachments.length > 0 && (
              <span className="ml-1.5 rounded-full bg-accent-primary/20 text-accent-primary px-1.5 py-0.5 text-xs font-bold">
                {attachments.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
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
                  <td className="px-4 py-3 text-industrial-500 max-w-xs truncate">
                    {s.source === 'manual' && (
                      <span className="mr-1.5 inline-block rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5">Previous Credit</span>
                    )}
                    {s.items_summary}
                  </td>
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
            {purchase_history.length > 0 && (
              <tfoot className="border-t-2 border-industrial-200 bg-industrial-50/80 text-xs font-semibold text-industrial-700">
                <tr>
                  <td className="px-4 py-3 text-industrial-500">Total ({purchase_history.length} {purchase_history.length === 1 ? 'sale' : 'sales'})</td>
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3 text-right">
                    {fmtCurrency(purchase_history.reduce((s: number, r: SaleRow) => s + Number(r.total_amount || 0), 0))}
                  </td>
                  <td className="px-4 py-3 text-right text-green-700">
                    {fmtCurrency(purchase_history.reduce((s: number, r: SaleRow) => s + Number(r.paid_amount || 0), 0))}
                  </td>
                  <td className="px-4 py-3 text-right text-orange-600">
                    {fmtCurrency(totalSalesPending)}
                  </td>
                  <td className="px-4 py-3" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {tab === 'attachments' && (
        <div className="space-y-5">
          {/* Upload Zone */}
          <div
            onDragOver={e => { e.preventDefault(); setAttDragging(true); }}
            onDragLeave={() => setAttDragging(false)}
            onDrop={e => {
              e.preventDefault(); setAttDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) uploadFile(file);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 cursor-pointer transition-all select-none
              ${attDragging ? 'border-accent-primary bg-accent-primary/5 scale-[1.01]' : 'border-industrial-300 bg-industrial-50 hover:border-accent-primary hover:bg-blue-50/60'}`}
          >
            <div className={`rounded-full p-4 ${attDragging ? 'bg-accent-primary/15' : 'bg-industrial-100'}`}>
              <Upload className={`h-7 w-7 ${attDragging ? 'text-accent-primary' : 'text-industrial-400'}`} />
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-industrial-700">
                {attUploading ? 'Uploading…' : attDragging ? 'Drop it here!' : 'Upload Receipt or Document'}
              </p>
              <p className="text-sm text-industrial-400 mt-1">Drag & drop or click to browse — photos, PDFs, Word, Excel</p>
            </div>
            <input ref={fileInputRef} type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); }} disabled={attUploading} />
          </div>

          {attError && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
              <p className="text-sm font-semibold text-red-700">{attError}</p>
            </div>
          )}

          {/* Files grid */}
          {attachments.length === 0 && !attUploading ? (
            <div className="flex flex-col items-center gap-3 py-12 text-industrial-400">
              <Paperclip className="h-10 w-10 opacity-30" />
              <p className="text-sm font-medium">No receipts or documents yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {attachments.map(att => {
                const isImage = att.mimetype?.startsWith('image/');
                return (
                  <AttachmentCard
                    key={att.id}
                    att={att}
                    isImage={isImage}
                    onPreview={setPreviewAtt}
                    onDownload={downloadAttachment}
                    onDelete={deleteAttachment}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Image Preview Modal */}
      {previewAtt && (
        <PreviewModal att={previewAtt} onClose={() => setPreviewAtt(null)} onDownload={downloadAttachment} />
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
      {showManualCredit && (
        <AddPreviousCreditModal
          customerId={parseInt(id!)}
          customerName={customer.name}
          onClose={() => setShowManualCredit(false)}
          onCreated={() => { setShowManualCredit(false); load(); }}
        />
      )}
    </div>
  );
}

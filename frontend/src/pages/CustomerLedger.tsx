import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowUpDown, CheckCircle2, CreditCard, Eye, EyeOff, FileDown, Plus, TrendingDown, Users, Wallet } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Modal } from '../components/ui/modal';
import { api } from '../lib/api';
import { useLang } from '../lib/i18n';
import { localizeApiText } from '../lib/localize';
import { fmtCurrency } from '../lib/utils';
import { downloadCustomerLedgerPdf } from '../lib/pdfExports';

interface LedgerEntry {
  id: string;
  date: string;
  type: 'sale' | 'payment';
  description: string;
  debit: number;
  credit: number;
  balance: number;
  sale_id?: number;
  payment_status?: string;
}

interface SaleRow {
  id: number;
  date: string;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  status: string;
  items_summary: string;
  source: string;
}

interface CustomerLedgerData {
  customer: { id: number; name: string; phone?: string; address?: string };
  totalDebit: number;
  totalCredit: number;
  balance: number;
  entries: LedgerEntry[];
  salesHistory: SaleRow[];
}

interface CustomerSummary {
  id: number;
  name: string;
  phone?: string;
  remaining_balance: number;
  total_purchased: number;
  total_paid: number;
  status: string;
}

export default function CustomerLedger() {
  const { isUrdu } = useLang();
  const locale = isUrdu ? 'ur-PK' : 'en-PK';
  const [searchParams] = useSearchParams();
  const [stripHidden, setStripHidden] = useState(() => localStorage.getItem('cust-strip-hidden') === 'true');
  const [tableHidden, setTableHidden] = useState(() => localStorage.getItem('cust-table-hidden') === 'true');
  const toggleStrip = (v: boolean) => { setStripHidden(v); localStorage.setItem('cust-strip-hidden', String(v)); };
  const toggleTable = (v: boolean) => { setTableHidden(v); localStorage.setItem('cust-table-hidden', String(v)); };
  const HS = (val: number) => stripHidden ? '••••••' : fmtCurrency(val);
  const HT = (val: number) => tableHidden ? '••••••' : fmtCurrency(val);

  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(() => {
    const param = searchParams.get('customer');
    return param ? Number(param) : null;
  });
  const [ledger, setLedger] = useState<CustomerLedgerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'ledger' | 'sales'>('ledger');
  const [sortBy, setSortBy] = useState<'name' | 'balance' | 'purchased'>('balance');
  const [payModal, setPayModal] = useState<{ sale_id: number; customer_id: number; max: number; description: string } | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [paying, setPaying] = useState(false);
  const [obModal, setObModal] = useState<{ customer_id: number; name: string } | null>(null);
  const [obForm, setObForm] = useState({ description: '', amount: '', date: new Date().toISOString().slice(0, 10) });
  const [obSaving, setObSaving] = useState(false);

  const loadSummary = async () => {
    const { data } = await api.get('/customers/ledger-list');
    setCustomers(data);
  };

  const loadLedger = async (id: number) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/customers/${id}/ledger-detail`);

      type RawEntry = Omit<LedgerEntry, 'balance'>;
      const raw: RawEntry[] = [
        ...data.purchase_history.map((s: any) => ({
          id: `sale-${s.id}`,
          date: s.date,
          type: 'sale' as const,
          description: s.items_summary || `Sale #${s.id}`,
          debit: Number(s.total_amount),
          credit: 0,
          sale_id: s.source === 'sale' ? s.id : undefined,
          payment_status: s.status,
        })),
        ...data.payment_history.map((p: any) => ({
          id: `pay-${p.id}`,
          date: p.payment_date,
          type: 'payment' as const,
          description: 'Payment received',
          debit: 0,
          credit: Number(p.amount_paid),
        })),
      ].sort((a, b) => (a.date < b.date ? -1 : 1));

      let running = 0;
      const entries: LedgerEntry[] = raw.map((e) => {
        running += e.debit - e.credit;
        return { ...e, balance: running };
      });

      setLedger({
        customer: data.customer,
        totalDebit: data.summary.total_purchased,
        totalCredit: data.summary.total_paid,
        balance: data.summary.remaining_balance,
        entries,
        salesHistory: data.purchase_history,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSummary(); }, []);
  useEffect(() => {
    if (selectedId) { setActiveTab('ledger'); loadLedger(selectedId); }
    else { setLedger(null); }
  }, [selectedId]);

  // Auto-select from URL param after customers load
  useEffect(() => {
    const param = searchParams.get('customer');
    if (param && customers.length > 0) setSelectedId(Number(param));
  }, [customers]);

  const creditSummary = useMemo(() => ({
    totalPurchased: customers.reduce((s, r) => s + r.total_purchased, 0),
    totalPaid: customers.reduce((s, r) => s + r.total_paid, 0),
    totalBalance: customers.reduce((s, r) => s + r.remaining_balance, 0),
    withDues: customers.filter((r) => r.remaining_balance > 0).length,
    cleared: customers.filter((r) => r.remaining_balance <= 0).length,
  }), [customers]);

  const sortedCustomers = useMemo(() => {
    return [...customers].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'balance') return b.remaining_balance - a.remaining_balance;
      return b.total_purchased - a.total_purchased;
    });
  }, [customers, sortBy]);

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });

  const submitPayment = async () => {
    if (!payModal || !payAmount) return;
    setPaying(true);
    try {
      await api.post('/customer-payments', {
        sale_id: payModal.sale_id,
        customer_id: payModal.customer_id,
        amount_paid: Number(payAmount),
        payment_date: new Date().toISOString(),
      });
      setPayModal(null);
      setPayAmount('');
      await loadSummary();
      await loadLedger(payModal.customer_id);
    } finally {
      setPaying(false);
    }
  };

  const submitOpeningBalance = async () => {
    if (!obModal || !obForm.description || !obForm.amount) return;
    setObSaving(true);
    try {
      await api.post(`/customers/${obModal.customer_id}/manual-credit`, {
        item_description: obForm.description,
        amount: Number(obForm.amount),
        credit_date: obForm.date,
      });
      setObModal(null);
      setObForm({ description: '', amount: '', date: new Date().toISOString().slice(0, 10) });
      await loadSummary();
      await loadLedger(obModal.customer_id);
    } finally {
      setObSaving(false);
    }
  };

  const sc: Record<string, string> = {
    paid: 'bg-green-50 text-green-700 border-green-200',
    partial: 'bg-amber-50 text-amber-700 border-amber-200',
    pending: 'bg-red-50 text-red-600 border-red-200',
    overdue: 'bg-red-100 text-red-700 border-red-300',
  };

  return (
    <div className={`flex flex-col gap-4 h-[calc(100vh-9rem)] ${isUrdu ? 'font-urdu' : ''}`}>

      {/* ── Credit Summary Strip ── */}
      <div className="shrink-0 grid grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-3.5 flex items-center gap-3 shadow-sm">
          <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
            <Users className="h-4 w-4 text-slate-600" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Billed</p>
            <p className="text-lg font-black text-slate-800">{HS(creditSummary.totalPurchased)}</p>
          </div>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-3.5 flex items-center gap-3 shadow-sm">
          <div className="h-9 w-9 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
            <Wallet className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-green-500">Collected</p>
            <p className="text-lg font-black text-green-700">{HS(creditSummary.totalPaid)}</p>
          </div>
        </div>
        <div className={`rounded-xl border px-5 py-3.5 flex items-center gap-3 shadow-sm ${creditSummary.totalBalance > 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${creditSummary.totalBalance > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
            <TrendingDown className={`h-4 w-4 ${creditSummary.totalBalance > 0 ? 'text-red-600' : 'text-green-600'}`} />
          </div>
          <div>
            <p className={`text-[11px] font-bold uppercase tracking-wider ${creditSummary.totalBalance > 0 ? 'text-red-400' : 'text-green-500'}`}>Outstanding</p>
            <p className={`text-lg font-black ${creditSummary.totalBalance > 0 ? 'text-red-700' : 'text-green-700'}`}>{HS(creditSummary.totalBalance)}</p>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-3.5 flex flex-col gap-2 shadow-sm">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Pending
              </span>
              <span className="text-base font-black text-red-600">{creditSummary.withDues}</span>
            </div>
            <div className="h-px bg-slate-100" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-green-500 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Cleared
              </span>
              <span className="text-base font-black text-green-600">{creditSummary.cleared}</span>
            </div>
          </div>
          <div className="pt-1 border-t border-slate-100 flex justify-end">
            <button
              onClick={() => toggleStrip(!stripHidden)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-500 transition-colors"
            >
              {stripHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              {stripHidden ? 'Show Amounts' : 'Hide Amounts'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Main panel ── */}
      <div className="flex-1 flex gap-0 rounded-2xl border-2 border-industrial-200 bg-white overflow-hidden shadow-sm min-h-0">

        {/* ── Left sidebar ── */}
        <aside className="w-60 shrink-0 flex flex-col border-r-2 border-industrial-100 bg-industrial-50">
          <div className="px-4 py-3 border-b border-industrial-200 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-industrial-400">Customers</p>
            {selectedId && (
              <button onClick={() => setSelectedId(null)} className="text-[10px] font-semibold text-industrial-400 hover:text-industrial-700 transition-colors">
                Overview
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto py-2 px-2 flex flex-col gap-1">
            {sortedCustomers.map((c) => {
              const isSelected = selectedId === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full rounded-xl px-3 py-2.5 text-left transition-all ${
                    isSelected
                      ? 'bg-industrial-800 text-white shadow-md'
                      : 'hover:bg-white hover:shadow-sm text-industrial-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-industrial-200 text-industrial-600'
                    }`}>
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`font-semibold truncate text-sm ${isSelected ? 'text-white' : 'text-industrial-900'}`}>
                        {localizeApiText(c.name, isUrdu)}
                      </p>
                      <p className={`text-xs font-semibold mt-0.5 ${
                        isSelected
                          ? c.remaining_balance > 0 ? 'text-red-300' : 'text-green-300'
                          : c.remaining_balance > 0 ? 'text-red-500' : 'text-green-600'
                      }`}>
                        {c.remaining_balance > 0 ? `Due: ${HT(c.remaining_balance)}` : 'Cleared'}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
            {customers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-industrial-400 gap-2">
                <Users className="h-8 w-8 text-industrial-300" />
                <p>No customers yet</p>
              </div>
            )}
          </div>
        </aside>

        {/* ── Right panel ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {loading && (
            <div className="flex flex-1 items-center justify-center text-industrial-400">
              <p className="text-sm">Loading…</p>
            </div>
          )}

          {/* ── All Customers Overview (no selection) ── */}
          {!selectedId && !loading && (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="shrink-0 px-6 py-4 border-b-2 border-industrial-100 bg-white flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-industrial-900">All Customers Overview</h2>
                  <p className="text-xs text-industrial-500 mt-0.5">Click a customer on the left to view their full ledger</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleTable(!tableHidden)}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition-colors mr-2"
                  >
                    {tableHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    {tableHidden ? 'Show Amounts' : 'Hide Amounts'}
                  </button>
                  <span className="text-xs font-semibold text-industrial-400">Sort by:</span>
                  {(['balance', 'purchased', 'name'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSortBy(s)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        sortBy === s ? 'bg-industrial-800 text-white' : 'bg-industrial-100 text-industrial-600 hover:bg-industrial-200'
                      }`}
                    >
                      <ArrowUpDown className="h-3 w-3" />
                      {s === 'balance' ? 'Balance' : s === 'purchased' ? 'Billed' : 'Name'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                {customers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-industrial-400 gap-2">
                    <Users className="h-10 w-10 text-industrial-300" />
                    <p className="font-semibold">No customers with sales yet</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-industrial-50 border-b-2 border-industrial-200 z-10">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-industrial-500">Customer</th>
                        <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-industrial-500">Total Billed</th>
                        <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-industrial-500">Collected</th>
                        <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-industrial-500">Outstanding</th>
                        <th className="px-5 py-3 text-center text-xs font-bold uppercase tracking-wider text-industrial-500">Status</th>
                        <th className="px-5 py-3 w-24"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-industrial-100">
                      {sortedCustomers.map((c) => (
                        <tr
                          key={c.id}
                          className="hover:bg-industrial-50/60 transition-colors cursor-pointer"
                          onClick={() => setSelectedId(c.id)}
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-lg bg-industrial-200 flex items-center justify-center text-sm font-bold text-industrial-600 shrink-0">
                                {c.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-industrial-900">{localizeApiText(c.name, isUrdu)}</p>
                                {c.phone && <p className="text-xs text-industrial-400 mt-0.5">{c.phone}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-right font-semibold text-industrial-900">{HT(c.total_purchased)}</td>
                          <td className="px-5 py-3.5 text-right font-semibold text-green-700">{HT(c.total_paid)}</td>
                          <td className="px-5 py-3.5 text-right font-bold">
                            <span className={c.remaining_balance > 0 ? 'text-red-600' : 'text-green-700'}>{HT(c.remaining_balance)}</span>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              c.remaining_balance > 0
                                ? 'bg-red-50 text-red-600 border-red-200'
                                : 'bg-green-50 text-green-700 border-green-200'
                            }`}>
                              {c.remaining_balance > 0 ? <AlertCircle className="h-2.5 w-2.5" /> : <CheckCircle2 className="h-2.5 w-2.5" />}
                              {c.remaining_balance > 0 ? 'Pending' : 'Cleared'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedId(c.id); }}
                              className="text-xs font-semibold text-industrial-500 hover:text-industrial-900 transition-colors"
                            >
                              View →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="sticky bottom-0 bg-industrial-100 border-t-2 border-industrial-200">
                      <tr>
                        <td className="px-5 py-3 font-bold text-sm text-industrial-700">Total ({customers.length} customers)</td>
                        <td className="px-5 py-3 text-right font-bold text-industrial-900">{HT(creditSummary.totalPurchased)}</td>
                        <td className="px-5 py-3 text-right font-bold text-green-700">{HT(creditSummary.totalPaid)}</td>
                        <td className="px-5 py-3 text-right font-bold">
                          <span className={creditSummary.totalBalance > 0 ? 'text-red-600' : 'text-green-700'}>{HT(creditSummary.totalBalance)}</span>
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            </div>
          )}

          {ledger && !loading && (
            <div className="flex flex-col h-full overflow-hidden">

              {/* ── Header ── */}
              <div className="shrink-0 px-6 py-4 border-b-2 border-industrial-100 bg-white">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-industrial-800 flex items-center justify-center text-white text-lg font-bold shrink-0">
                      {ledger.customer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-industrial-900 leading-tight">
                        {localizeApiText(ledger.customer.name, isUrdu)}
                      </h2>
                      <div className="flex items-center gap-3 mt-0.5">
                        {ledger.customer.phone && (
                          <span className="text-xs text-industrial-500">{ledger.customer.phone}</span>
                        )}
                        {ledger.customer.address && (
                          <span className="text-xs text-industrial-400">· {ledger.customer.address}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stat pills */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-center px-4 py-2 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Total Billed</p>
                      <p className="text-base font-bold text-slate-800">{HT(ledger.totalDebit)}</p>
                    </div>
                    <div className="text-center px-4 py-2 rounded-xl bg-green-50 border border-green-200">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-green-500 mb-0.5">Collected</p>
                      <p className="text-base font-bold text-green-700">{HT(ledger.totalCredit)}</p>
                    </div>
                    <div className={`text-center px-4 py-2 rounded-xl border ${ledger.balance > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                      <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${ledger.balance > 0 ? 'text-red-400' : 'text-green-500'}`}>Balance</p>
                      <p className={`text-base font-bold ${ledger.balance > 0 ? 'text-red-700' : 'text-green-700'}`}>{HT(ledger.balance)}</p>
                    </div>
                    <button
                      onClick={() => toggleTable(!tableHidden)}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
                    >
                      {tableHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      {tableHidden ? 'Show' : 'Hide'}
                    </button>
                    <button
                      onClick={() =>
                        downloadCustomerLedgerPdf({
                          customer: ledger.customer,
                          totalDebit: ledger.totalDebit,
                          totalCredit: ledger.totalCredit,
                          balance: ledger.balance,
                          entries: ledger.entries,
                          salesHistory: ledger.salesHistory,
                        })
                      }
                      className="flex items-center gap-1.5 rounded-xl border border-industrial-300 bg-white px-3 py-2 text-xs font-semibold text-industrial-700 hover:bg-industrial-50 transition-colors"
                    >
                      <FileDown className="h-4 w-4" />
                      PDF
                    </button>
                    <button
                      onClick={() => setObModal({ customer_id: ledger.customer.id, name: ledger.customer.name })}
                      className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Opening Balance
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Tabs ── */}
              <div className="shrink-0 flex gap-0 border-b-2 border-industrial-100 bg-white px-6">
                {(['ledger', 'sales'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`relative px-5 py-3 text-sm font-semibold transition-colors ${
                      activeTab === tab
                        ? 'text-industrial-900'
                        : 'text-industrial-400 hover:text-industrial-700'
                    }`}
                  >
                    {tab === 'ledger' ? 'Transactions' : (
                      <span className="flex items-center gap-1.5">
                        Sales Summary
                        {ledger.salesHistory.length > 0 && (
                          <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-industrial-800 text-white text-[9px] font-bold px-1">
                            {ledger.salesHistory.length}
                          </span>
                        )}
                      </span>
                    )}
                    {activeTab === tab && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-industrial-800 rounded-t" />
                    )}
                  </button>
                ))}
              </div>

              {/* ── Tab content ── */}
              <div className="flex-1 overflow-auto">

                {/* Sales Summary */}
                {activeTab === 'sales' && (
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-industrial-50 border-b-2 border-industrial-200 z-10">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-industrial-500">Date</th>
                        <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-industrial-500">Items</th>
                        <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-industrial-500">Billed</th>
                        <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-industrial-500">Collected</th>
                        <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-industrial-500">Outstanding</th>
                        <th className="px-5 py-3 text-center text-xs font-bold uppercase tracking-wider text-industrial-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-industrial-100">
                      {ledger.salesHistory.length === 0 ? (
                        <tr><td colSpan={6} className="py-16 text-center text-industrial-400">No sales yet</td></tr>
                      ) : ledger.salesHistory.map((row) => (
                        <tr key={`${row.source}-${row.id}`} className="hover:bg-industrial-50/60 transition-colors">
                          <td className="px-5 py-3.5 text-industrial-500 text-xs whitespace-nowrap">{fmtDate(row.date)}</td>
                          <td className="px-5 py-3.5 font-medium text-industrial-800 max-w-xs truncate">{row.items_summary || '—'}</td>
                          <td className="px-5 py-3.5 text-right font-semibold text-industrial-900">{HT(row.total_amount)}</td>
                          <td className="px-5 py-3.5 text-right font-semibold text-green-700">{HT(row.paid_amount)}</td>
                          <td className="px-5 py-3.5 text-right font-bold">
                            <span className={row.pending_amount > 0 ? 'text-red-600' : 'text-green-700'}>{HT(row.pending_amount)}</span>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${sc[row.status] ?? sc.pending}`}>
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {ledger.salesHistory.length > 0 && (
                      <tfoot className="sticky bottom-0 bg-industrial-100 border-t-2 border-industrial-200">
                        <tr>
                          <td className="px-5 py-3 font-bold text-industrial-700 text-sm" colSpan={2}>Total</td>
                          <td className="px-5 py-3 text-right font-bold text-industrial-900">{HT(ledger.totalDebit)}</td>
                          <td className="px-5 py-3 text-right font-bold text-green-700">{HT(ledger.totalCredit)}</td>
                          <td className="px-5 py-3 text-right font-bold">
                            <span className={ledger.balance > 0 ? 'text-red-600' : 'text-green-700'}>{HT(ledger.balance)}</span>
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                )}

                {/* Transaction Ledger */}
                {activeTab === 'ledger' && (
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-industrial-50 border-b-2 border-industrial-200 z-10">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-industrial-500 w-28">Date</th>
                        <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-industrial-500">Description</th>
                        <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-industrial-500 w-32">Sale Amount</th>
                        <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-industrial-500 w-32">Collected</th>
                        <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-industrial-500 w-32">Outstanding</th>
                        <th className="px-5 py-3 w-28"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-industrial-100">
                      {ledger.entries.length === 0 ? (
                        <tr><td colSpan={6} className="py-16 text-center text-industrial-400">No transactions yet</td></tr>
                      ) : ledger.entries.map((entry) => {
                        const isSale = entry.type === 'sale';
                        return (
                          <tr
                            key={entry.id}
                            className={`transition-colors ${isSale ? 'hover:bg-red-50/40' : 'hover:bg-green-50/40'}`}
                          >
                            <td className="px-5 py-3.5 text-industrial-500 text-xs whitespace-nowrap">
                              {fmtDate(entry.date)}
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px] font-bold ${
                                  isSale ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'
                                }`}>
                                  {isSale ? 'BILL' : 'PAID'}
                                </span>
                                <span className="font-medium text-industrial-800 truncate max-w-xs">{entry.description}</span>
                                {entry.payment_status && isSale && (
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                    entry.payment_status === 'paid'
                                      ? 'bg-green-50 text-green-700 border-green-200'
                                      : entry.payment_status === 'partial'
                                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                                      : 'bg-red-50 text-red-600 border-red-200'
                                  }`}>
                                    {entry.payment_status}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-right font-semibold">
                              {entry.debit > 0
                                ? <span className="text-red-600">{HT(entry.debit)}</span>
                                : <span className="text-industrial-300">—</span>}
                            </td>
                            <td className="px-5 py-3.5 text-right font-semibold">
                              {entry.credit > 0
                                ? <span className="text-green-700">{HT(entry.credit)}</span>
                                : <span className="text-industrial-300">—</span>}
                            </td>
                            <td className="px-5 py-3.5 text-right font-bold">
                              <span className={entry.balance > 0 ? 'text-red-600' : 'text-green-700'}>
                                {HT(entry.balance)}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              {isSale && entry.payment_status !== 'paid' && entry.sale_id && (
                                <button
                                  onClick={() => {
                                    setPayModal({
                                      sale_id: entry.sale_id!,
                                      customer_id: ledger.customer.id,
                                      max: entry.debit,
                                      description: entry.description,
                                    });
                                    setPayAmount(String(entry.balance > 0 ? entry.balance : entry.debit));
                                  }}
                                  className="flex items-center gap-1 rounded-lg bg-green-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-green-700 transition-colors"
                                >
                                  <CreditCard className="h-3 w-3" /> Collect
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {ledger.entries.length > 0 && (
                      <tfoot className="sticky bottom-0 bg-industrial-100 border-t-2 border-industrial-200">
                        <tr>
                          <td colSpan={2} className="px-5 py-3 font-bold text-sm text-industrial-700">Total</td>
                          <td className="px-5 py-3 text-right font-bold text-red-600">{HT(ledger.totalDebit)}</td>
                          <td className="px-5 py-3 text-right font-bold text-green-700">{HT(ledger.totalCredit)}</td>
                          <td className="px-5 py-3 text-right font-bold">
                            <span className={ledger.balance > 0 ? 'text-red-600' : 'text-green-700'}>{HT(ledger.balance)}</span>
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                )}

              </div>
            </div>
          )}
        </div>

      </div>{/* end main panel */}

      {/* ── Collect Modal ── */}
      {payModal && (
        <Modal open={!!payModal} title="Record Payment from Customer" onClose={() => setPayModal(null)}>
          <div className="space-y-4">
            <div className="rounded-lg bg-industrial-50 border border-industrial-200 px-4 py-3">
              <p className="text-sm font-semibold text-industrial-700">{payModal.description}</p>
              <p className="text-xs text-industrial-500 mt-0.5">
                <Wallet className="inline h-3 w-3 mr-1" />
                {localizeApiText(ledger?.customer.name ?? '', isUrdu)}
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-industrial-700">Amount Collected (Rs)</label>
              <Input
                type="number"
                autoFocus
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="text-lg font-bold"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={submitPayment} disabled={paying || !payAmount} className="flex-1">
                {paying ? 'Saving…' : 'Confirm Collection'}
              </Button>
              <Button onClick={() => setPayModal(null)} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Opening Balance Modal ── */}
      {obModal && (
        <Modal open={!!obModal} title={`Opening Balance — ${obModal.name}`} onClose={() => setObModal(null)}>
          <div className="space-y-4">
            <p className="text-sm text-industrial-500">Record an existing amount this customer already owes from before the system was set up.</p>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-industrial-700">Description</label>
              <input
                className="h-10 w-full rounded-lg border-2 border-industrial-200 px-3 text-sm outline-none focus:border-amber-400"
                placeholder="e.g. Previous credit, old dues, etc."
                value={obForm.description}
                onChange={(e) => setObForm({ ...obForm, description: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-industrial-700">Amount (Rs)</label>
              <Input
                type="number"
                autoFocus
                placeholder="0"
                value={obForm.amount}
                onChange={(e) => setObForm({ ...obForm, amount: e.target.value })}
                className="text-lg font-bold"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-industrial-700">Date</label>
              <Input type="date" value={obForm.date} onChange={(e) => setObForm({ ...obForm, date: e.target.value })} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={submitOpeningBalance} disabled={obSaving || !obForm.description || !obForm.amount} className="flex-1 bg-amber-500 hover:bg-amber-600">
                {obSaving ? 'Saving…' : 'Add Opening Balance'}
              </Button>
              <Button onClick={() => setObModal(null)} variant="outline" className="flex-1">Cancel</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

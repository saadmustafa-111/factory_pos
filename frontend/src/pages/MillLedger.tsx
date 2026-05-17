import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowUpDown, Building2, CheckCircle2, CreditCard, Eye, EyeOff, FileDown, Package, Plus, TrendingDown, Wallet } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Modal } from '../components/ui/modal';
import { AttachmentManager } from '../components/AttachmentManager';
import { api } from '../lib/api';
import { useLang } from '../lib/i18n';
import { localizeApiText } from '../lib/localize';
import { fmtCurrency } from '../lib/utils';
import { downloadSupplierLedgerPdf } from '../lib/pdfExports';

interface LedgerEntry {
  id: string;
  date: string;
  type: 'purchase' | 'payment';
  description: string;
  qty?: number;
  rate?: number;
  debit: number;
  credit: number;
  balance: number;
  inventory_id?: number;
  payment_status?: string;
}

interface ProductRow {
  productId: number;
  productName: string;
  brandName: string | null;
  totalQty: number;
  totalCost: number;
  totalPaid: number;
  balance: number;
}

interface SupplierLedger {
  supplier: { id: number; name: string; phone?: string; business_name?: string };
  totalDebit: number;
  totalCredit: number;
  balance: number;
  entries: LedgerEntry[];
  productSummary: ProductRow[];
}

interface SupplierSummary {
  supplier: { id: number; name: string; phone?: string };
  balance: number;
  totalPurchased: number;
  totalPaid: number;
}

export default function MillLedger() {
  const { isUrdu } = useLang();
  const locale = isUrdu ? 'ur-PK' : 'en-PK';
  const [searchParams] = useSearchParams();
  const [stripHidden, setStripHidden] = useState(() => localStorage.getItem('mill-strip-hidden') === 'true');
  const [tableHidden, setTableHidden] = useState(() => localStorage.getItem('mill-table-hidden') === 'true');
  const toggleStrip = (v: boolean) => { setStripHidden(v); localStorage.setItem('mill-strip-hidden', String(v)); };
  const toggleTable = (v: boolean) => { setTableHidden(v); localStorage.setItem('mill-table-hidden', String(v)); };
  const HS = (val: number) => stripHidden ? '••••••' : fmtCurrency(val);  // top strip
  const HT = (val: number) => tableHidden ? '••••••' : fmtCurrency(val); // table/ledger

  const [suppliers, setSuppliers] = useState<SupplierSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(() => {
    const param = searchParams.get('supplier');
    return param ? Number(param) : null;
  });
  const [ledger, setLedger] = useState<SupplierLedger | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'ledger' | 'products'>('ledger');
  const [sortBy, setSortBy] = useState<'name' | 'balance' | 'purchased'>('balance');
  const [payModal, setPayModal] = useState<{ inv_id: number; supplier_id: number; max: number; description: string } | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [paying, setPaying] = useState(false);
  const [adjModal, setAdjModal] = useState<{ supplier_id: number; name: string } | null>(null);
  const [adjForm, setAdjForm] = useState({ type: 'debit' as 'debit' | 'credit', description: '', amount: '', date: new Date().toISOString().slice(0, 10) });
  const [adjSaving, setAdjSaving] = useState(false);

  const loadSummary = async () => {
    const { data } = await api.get('/mill-payments/ledger');
    setSuppliers(data);
  };

  const loadLedger = async (id: number) => {
    setLoading(true);
    try {
      const { data } = await api.get<SupplierLedger>(`/mill-payments/ledger/${id}`);
      setLedger(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSummary(); }, []);
  useEffect(() => {
    if (selectedId) { setActiveTab('ledger'); loadLedger(selectedId); }
    else { setLedger(null); }
  }, [selectedId]);

  // Auto-select from URL param after suppliers load
  useEffect(() => {
    const param = searchParams.get('supplier');
    if (param && suppliers.length > 0) setSelectedId(Number(param));
  }, [suppliers]);

  // Aggregate credit summary
  const creditSummary = useMemo(() => ({
    totalPurchased: suppliers.reduce((s, r) => s + r.totalPurchased, 0),
    totalPaid: suppliers.reduce((s, r) => s + r.totalPaid, 0),
    totalBalance: suppliers.reduce((s, r) => s + r.balance, 0),
    withDues: suppliers.filter((r) => r.balance > 0).length,
    cleared: suppliers.filter((r) => r.balance <= 0).length,
  }), [suppliers]);

  const [supplierSearch, setSupplierSearch] = useState('');
  const filteredSuppliers = useMemo(() => {
    const q = supplierSearch.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter(s =>
      s.supplier.name.toLowerCase().includes(q) || (s.supplier.phone && s.supplier.phone.includes(q))
    );
  }, [suppliers, supplierSearch]);
  const sortedSuppliers = useMemo(() => {
    return [...filteredSuppliers].sort((a, b) => {
      if (sortBy === 'name') return a.supplier.name.localeCompare(b.supplier.name);
      if (sortBy === 'balance') return b.balance - a.balance;
      return b.totalPurchased - a.totalPurchased;
    });
  }, [filteredSuppliers, sortBy]);

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });

  const submitPayment = async () => {
    if (!payModal || !payAmount) return;
    setPaying(true);
    try {
      await api.post('/mill-payments', {
        supplier_id: payModal.supplier_id,
        inventory_id: payModal.inv_id,
        amount_paid: Number(payAmount),
        payment_date: new Date().toISOString(),
      });
      setPayModal(null);
      setPayAmount('');
      await loadSummary();
      await loadLedger(payModal.supplier_id);
    } finally {
      setPaying(false);
    }
  };

  const submitAdjustment = async () => {
    if (!adjModal || !adjForm.description || !adjForm.amount) return;
    setAdjSaving(true);
    try {
      if (adjForm.type === 'debit') {
        await api.post(`/mill-payments/${adjModal.supplier_id}/opening-balance`, {
          description: adjForm.description,
          amount: Number(adjForm.amount),
          balance_date: adjForm.date,
        });
      } else {
        await api.post(`/mill-payments/${adjModal.supplier_id}/manual-payment`, {
          description: adjForm.description,
          amount: Number(adjForm.amount),
          payment_date: adjForm.date,
        });
      }
      const sid = adjModal.supplier_id;
      setAdjModal(null);
      setAdjForm({ type: 'debit', description: '', amount: '', date: new Date().toISOString().slice(0, 10) });
      await loadSummary();
      await loadLedger(sid);
    } finally {
      setAdjSaving(false);
    }
  };

  return (
    <div className={`flex flex-col gap-4 h-[calc(100vh-9rem)] ${isUrdu ? 'font-urdu' : ''}`}>

      {/* ── Credit Summary Strip ── */}
      <div className="shrink-0 grid grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-3.5 flex items-center gap-3 shadow-sm">
          <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
            <Building2 className="h-4 w-4 text-slate-600" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Purchased</p>
            <p className="text-lg font-black text-slate-800">{HS(creditSummary.totalPurchased)}</p>
          </div>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-3.5 flex items-center gap-3 shadow-sm">
          <div className="h-9 w-9 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
            <Wallet className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-green-500">Total Paid</p>
            <p className="text-lg font-black text-green-700">{HS(creditSummary.totalPaid)}</p>
          </div>
        </div>
        <div className={`rounded-xl border px-5 py-3.5 flex items-center gap-3 shadow-sm ${creditSummary.totalBalance > 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${creditSummary.totalBalance > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
            <TrendingDown className={`h-4 w-4 ${creditSummary.totalBalance > 0 ? 'text-red-600' : 'text-green-600'}`} />
          </div>
          <div>
            <p className={`text-[11px] font-bold uppercase tracking-wider ${creditSummary.totalBalance > 0 ? 'text-red-400' : 'text-green-500'}`}>Total Due Balance</p>
            <p className={`text-lg font-black ${creditSummary.totalBalance > 0 ? 'text-red-700' : 'text-green-700'}`}>{HS(creditSummary.totalBalance)}</p>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-3.5 flex flex-col gap-2 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-1 flex-1">
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
          </div>
          <div className="pt-1 border-t border-slate-100 flex justify-end">
            <button
              onClick={() => toggleStrip(!stripHidden)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-500 transition-colors"
            >
              {stripHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              {stripHidden ? 'Show' : 'Hide'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Main panel ── */}
      <div className="flex-1 flex gap-0 rounded-2xl border-2 border-industrial-200 bg-white overflow-hidden shadow-sm min-h-0">

      {/* ── Left sidebar ── */}
      <aside className="w-60 shrink-0 flex flex-col border-r-2 border-industrial-100 bg-industrial-50">
        <div className="px-4 py-3 border-b border-industrial-200 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-widest text-industrial-400">Dealers</p>
          {selectedId && (
            <button onClick={() => setSelectedId(null)} className="text-[10px] font-semibold text-industrial-400 hover:text-industrial-700 transition-colors">
              Overview
            </button>
          )}
        </div>
        <div className="px-2 pt-2 pb-1">
          <Input
            value={supplierSearch}
            onChange={e => setSupplierSearch(e.target.value)}
            placeholder="Search..."
            className="h-8 text-xs px-2"
          />
        </div>
        <div className="flex-1 overflow-y-auto pb-2 px-2 flex flex-col gap-1">
          {sortedSuppliers.map((s) => {
            const isSelected = selectedId === s.supplier.id;
            return (
              <button
                key={s.supplier.id}
                onClick={() => setSelectedId(s.supplier.id)}
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
                    {s.supplier.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`font-semibold truncate text-sm ${isSelected ? 'text-white' : 'text-industrial-900'}`}> 
                      {localizeApiText(s.supplier.name, isUrdu)}
                    </p>
                    <p className={`text-xs font-semibold mt-0.5 ${
                      isSelected
                        ? s.balance > 0 ? 'text-red-300' : 'text-green-300'
                        : s.balance > 0 ? 'text-red-500' : 'text-green-600'
                    }`}>
                      {s.balance > 0 ? `Due: ${HT(s.balance)}` : 'Cleared'}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
          {filteredSuppliers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-industrial-400 gap-2">
              <Building2 className="h-8 w-8 text-industrial-300" />
              <p>No dealers found</p>
            </div>
          )}
        </div>
      </aside>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Loading state */}
        {loading && (
          <div className="flex flex-1 items-center justify-center text-industrial-400">
            <p className="text-sm">Loading…</p>
          </div>
        )}

        {/* ── All Dealers Overview (no selection) ── */}
        {!selectedId && !loading && (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="shrink-0 px-6 py-4 border-b-2 border-industrial-100 bg-white flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-industrial-900">All Dealers Overview</h2>
                <p className="text-xs text-industrial-500 mt-0.5">Click a dealer on the left to view their full ledger</p>
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
                    {s === 'balance' ? 'Balance' : s === 'purchased' ? 'Purchased' : 'Name'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              {suppliers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-industrial-400 gap-2">
                  <Building2 className="h-10 w-10 text-industrial-300" />
                  <p className="font-semibold">No suppliers yet — add one from the Suppliers page</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-industrial-50 border-b-2 border-industrial-200 z-10">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-industrial-500">Dealer</th>
                      <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-industrial-500">Total Purchased</th>
                      <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-industrial-500">Paid</th>
                      <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-industrial-500">Total Due Balance</th>
                      <th className="px-5 py-3 text-center text-xs font-bold uppercase tracking-wider text-industrial-500">Status</th>
                      <th className="px-5 py-3 w-24"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-industrial-100">
                    {sortedSuppliers.map((s) => (
                      <tr
                        key={s.supplier.id}
                        className="hover:bg-industrial-50/60 transition-colors cursor-pointer"
                        onClick={() => setSelectedId(s.supplier.id)}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-lg bg-industrial-200 flex items-center justify-center text-sm font-bold text-industrial-600 shrink-0">
                              {s.supplier.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-industrial-900">{localizeApiText(s.supplier.name, isUrdu)}</p>
                              {s.supplier.phone && <p className="text-xs text-industrial-400 mt-0.5">{s.supplier.phone}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right font-semibold text-industrial-900">{HT(s.totalPurchased)}</td>
                        <td className="px-5 py-3.5 text-right font-semibold text-green-700">{HT(s.totalPaid)}</td>
                        <td className="px-5 py-3.5 text-right font-bold">
                          <span className={s.balance > 0 ? 'text-red-600' : 'text-green-700'}>{HT(s.balance)}</span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            s.balance > 0
                              ? 'bg-red-50 text-red-600 border-red-200'
                              : 'bg-green-50 text-green-700 border-green-200'
                          }`}>
                            {s.balance > 0 ? <AlertCircle className="h-2.5 w-2.5" /> : <CheckCircle2 className="h-2.5 w-2.5" />}
                            {s.balance > 0 ? 'Pending' : 'Cleared'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedId(s.supplier.id); }}
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
                      <td className="px-5 py-3 font-bold text-sm text-industrial-700">Total ({suppliers.length} dealers)</td>
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
                    {ledger.supplier.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-industrial-900 leading-tight">
                      {localizeApiText(ledger.supplier.name, isUrdu)}
                    </h2>
                    <div className="flex items-center gap-3 mt-0.5">
                      {ledger.supplier.phone && (
                        <span className="text-xs text-industrial-500">{ledger.supplier.phone}</span>
                      )}
                      {ledger.supplier.business_name && (
                        <span className="text-xs text-industrial-400">· {ledger.supplier.business_name}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stat pills */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-center px-4 py-2 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Purchased</p>
                    <p className="text-base font-bold text-slate-800">{HT(ledger.totalDebit)}</p>
                  </div>
                  <div className="text-center px-4 py-2 rounded-xl bg-green-50 border border-green-200">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-green-500 mb-0.5">Paid</p>
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
                      downloadSupplierLedgerPdf({
                        supplier: ledger.supplier,
                        totalDebit: ledger.totalDebit,
                        totalCredit: ledger.totalCredit,
                        balance: ledger.balance,
                        entries: ledger.entries,
                        productSummary: ledger.productSummary,
                      })
                    }
                    className="flex items-center gap-1.5 rounded-xl border border-industrial-300 bg-white px-3 py-2 text-xs font-semibold text-industrial-700 hover:bg-industrial-50 transition-colors"
                  >
                    <FileDown className="h-4 w-4" />
                    PDF
                  </button>
                  <button
                    onClick={() => setAdjModal({ supplier_id: ledger.supplier.id, name: ledger.supplier.name })}
                    className="flex items-center gap-1.5 rounded-xl border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Adjust Balance
                  </button>
                </div>
              </div>
            </div>

            {/* ── Tabs ── */}
            <div className="shrink-0 flex gap-0 border-b-2 border-industrial-100 bg-white px-6">
              {(['ledger', 'products'] as const).map((tab) => (
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
                      Product Summary
                      {ledger.productSummary.length > 0 && (
                        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-industrial-800 text-white text-[9px] font-bold px-1">
                          {ledger.productSummary.length}
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

              {/* Product Summary */}
              {activeTab === 'products' && (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-industrial-50 border-b-2 border-industrial-200 z-10">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-industrial-500">Product</th>
                      <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-industrial-500">Brand</th>
                      <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-industrial-500">Total Qty</th>
                      <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-industrial-500">Total Cost</th>
                      <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-industrial-500">Paid</th>
                      <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-industrial-500">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-industrial-100">
                    {ledger.productSummary.length === 0 ? (
                      <tr><td colSpan={6} className="py-16 text-center text-industrial-400">No purchases yet</td></tr>
                    ) : ledger.productSummary.map((row) => (
                      <tr key={`${row.productId}-${row.brandName}`} className="hover:bg-industrial-50/60 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-industrial-400 shrink-0" />
                            <span className="font-semibold text-industrial-900">{localizeApiText(row.productName, isUrdu)}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-industrial-500 text-sm">
                          {row.brandName ? localizeApiText(row.brandName, isUrdu) : <span className="text-industrial-300">—</span>}
                        </td>
                        <td className="px-5 py-3.5 text-right font-medium text-industrial-700">{row.totalQty.toLocaleString()}</td>
                        <td className="px-5 py-3.5 text-right font-semibold text-industrial-900">{HT(row.totalCost)}</td>
                        <td className="px-5 py-3.5 text-right font-semibold text-green-700">{HT(row.totalPaid)}</td>
                        <td className="px-5 py-3.5 text-right font-bold">
                          <span className={row.balance > 0 ? 'text-red-600' : 'text-green-700'}>{HT(row.balance)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {ledger.productSummary.length > 0 && (
                    <tfoot className="sticky bottom-0 bg-industrial-100 border-t-2 border-industrial-200">
                      <tr>
                        <td className="px-5 py-3 font-bold text-industrial-700 text-sm" colSpan={2}>Total</td>
                        <td className="px-5 py-3 text-right font-bold text-industrial-700">
                          {ledger.productSummary.reduce((s, r) => s + r.totalQty, 0).toLocaleString()}
                        </td>
                        <td className="px-5 py-3 text-right font-bold text-industrial-900">{HT(ledger.totalDebit)}</td>
                        <td className="px-5 py-3 text-right font-bold text-green-700">{HT(ledger.totalCredit)}</td>
                        <td className="px-5 py-3 text-right font-bold">
                          <span className={ledger.balance > 0 ? 'text-red-600' : 'text-green-700'}>{HT(ledger.balance)}</span>
                        </td>
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
                      <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-industrial-500 w-20">Qty</th>
                      <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-industrial-500 w-28">Rate</th>
                      <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-industrial-500 w-32">Debit</th>
                      <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-industrial-500 w-32">Credit</th>
                      <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-industrial-500 w-32">Balance</th>
                      <th className="px-5 py-3 w-28"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-industrial-100">
                    {ledger.entries.length === 0 ? (
                      <tr><td colSpan={8} className="py-16 text-center text-industrial-400">No transactions yet</td></tr>
                    ) : ledger.entries.map((entry) => {
                      const isPurchase = entry.type === 'purchase';
                      return (
                        <tr
                          key={entry.id}
                          className={`transition-colors ${isPurchase ? 'hover:bg-red-50/40' : 'hover:bg-green-50/40'}`}
                        >
                          <td className="px-5 py-3.5 text-industrial-500 text-xs whitespace-nowrap">
                            {fmtDate(entry.date)}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px] font-bold ${
                                isPurchase ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'
                              }`}>
                                {isPurchase ? 'DR' : 'CR'}
                              </span>
                              <span className="font-medium text-industrial-800">{entry.description}</span>
                              {entry.payment_status && isPurchase && (
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
                          <td className="px-5 py-3.5 text-right text-industrial-600 text-sm">
                            {entry.qty != null ? entry.qty.toLocaleString() : '—'}
                          </td>
                          <td className="px-5 py-3.5 text-right text-industrial-600 text-sm">
                            {entry.rate != null ? HT(entry.rate) : '—'}
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
                            <div className="flex items-center justify-end gap-1.5">
                              {isPurchase && entry.payment_status !== 'paid' && entry.inventory_id && (
                                <button
                                  onClick={() => {
                                    const pending = entry.balance > 0 ? entry.debit : 0;
                                    setPayModal({
                                      inv_id: entry.inventory_id!,
                                      supplier_id: ledger.supplier.id,
                                      max: pending,
                                      description: entry.description,
                                    });
                                    setPayAmount(String(pending));
                                  }}
                                  className="flex items-center gap-1 rounded-lg bg-green-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-green-700 transition-colors"
                                >
                                  <CreditCard className="h-3 w-3" /> Pay
                                </button>
                              )}
                              {isPurchase && entry.inventory_id && (
                                <AttachmentManager
                                  entityType="inventory"
                                  entityId={entry.inventory_id}
                                  label={entry.description}
                                />
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {ledger.entries.length > 0 && (
                    <tfoot className="sticky bottom-0 bg-industrial-100 border-t-2 border-industrial-200">
                      <tr>
                        <td colSpan={4} className="px-5 py-3 font-bold text-sm text-industrial-700">Total</td>
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

      {/* ── Pay Modal ── */}
      {payModal && (
        <Modal open={!!payModal} title="Record Payment to Dealer" onClose={() => setPayModal(null)}>
          <div className="space-y-4">
            <div className="rounded-lg bg-industrial-50 border border-industrial-200 px-4 py-3">
              <p className="text-sm font-semibold text-industrial-700">{payModal.description}</p>
              <p className="text-xs text-industrial-500 mt-0.5">
                <Wallet className="inline h-3 w-3 mr-1" />
                {localizeApiText(ledger?.supplier.name ?? '', isUrdu)}
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-industrial-700">Payment Amount (Rs)</label>
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
                {paying ? 'Saving…' : 'Confirm Payment'}
              </Button>
              <Button onClick={() => setPayModal(null)} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Adjust Balance Modal ── */}
      {adjModal && (
        <Modal open={!!adjModal} title={`Adjust Balance — ${adjModal.name}`} onClose={() => setAdjModal(null)}>
          <div className="space-y-4">
            {/* Type selector */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setAdjForm({ ...adjForm, type: 'debit' })}
                className={`rounded-lg border-2 px-4 py-3 text-sm font-semibold transition-colors ${adjForm.type === 'debit' ? 'border-red-400 bg-red-50 text-red-700' : 'border-industrial-200 bg-white text-industrial-500 hover:bg-industrial-50'}`}
              >
                <div className="text-base">📦 Purana Udhar</div>
                <div className="text-xs font-normal mt-0.5 opacity-70">Dealer ko jo pehle se dena tha</div>
              </button>
              <button
                onClick={() => setAdjForm({ ...adjForm, type: 'credit' })}
                className={`rounded-lg border-2 px-4 py-3 text-sm font-semibold transition-colors ${adjForm.type === 'credit' ? 'border-green-400 bg-green-50 text-green-700' : 'border-industrial-200 bg-white text-industrial-500 hover:bg-industrial-50'}`}
              >
                <div className="text-base">💵 Pehli Payment</div>
                <div className="text-xs font-normal mt-0.5 opacity-70">Jo payment pehle ho chuki thi</div>
              </button>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-industrial-700">Description</label>
              <input
                className="h-10 w-full rounded-lg border-2 border-industrial-200 px-3 text-sm outline-none focus:border-blue-400"
                placeholder={adjForm.type === 'debit' ? 'e.g. Cement purchase, old dues…' : 'e.g. Cash paid, bank transfer…'}
                value={adjForm.description}
                onChange={(e) => setAdjForm({ ...adjForm, description: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-industrial-700">Amount (Rs)</label>
              <Input
                type="number"
                autoFocus
                placeholder="0"
                value={adjForm.amount}
                onChange={(e) => setAdjForm({ ...adjForm, amount: e.target.value })}
                className="text-lg font-bold"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-industrial-700">Date</label>
              <Input type="date" value={adjForm.date} onChange={(e) => setAdjForm({ ...adjForm, date: e.target.value })} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                onClick={submitAdjustment}
                disabled={adjSaving || !adjForm.description || !adjForm.amount}
                className={`flex-1 ${adjForm.type === 'debit' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {adjSaving ? 'Saving…' : adjForm.type === 'debit' ? 'Add Purana Udhar' : 'Add Pehli Payment'}
              </Button>
              <Button onClick={() => setAdjModal(null)} variant="outline" className="flex-1">Cancel</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}



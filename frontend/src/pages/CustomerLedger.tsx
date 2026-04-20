import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { useLang } from '../lib/i18n';
import { localizeApiText } from '../lib/localize';
import { fmtCurrency } from '../lib/utils';

type Filter = 'all' | 'has-balance' | 'overdue';

export default function CustomerLedger() {
  const { t, isUrdu } = useLang();
  const locale = isUrdu ? 'ur-PK' : 'en-PK';
  const [filter, setFilter] = useState<Filter>('all');
  const [sales, setSales] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [paymentModal, setPaymentModal] = useState<any>(null);
  const [amount, setAmount] = useState('');

  const load = async () => {
    const [salesRes, ledgerRes] = await Promise.all([
      api.get('/sales', { params: { status: filter === 'overdue' ? 'overdue' : 'all' } }),
      api.get('/customer-payments/ledger'),
    ]);
    let rows = salesRes.data;
    if (filter === 'has-balance') rows = rows.filter((r: any) => r.pending_amount > 0);
    setSales(rows);
    setLedger(ledgerRes.data.summary || []);
  };
  useEffect(() => { load(); }, [filter]);

  const submitPayment = async () => {
    if (!paymentModal || !amount) return;
    await api.post('/customer-payments', {
      sale_id: paymentModal.id, customer_id: paymentModal.customer_id,
      amount_paid: Number(amount), payment_date: new Date().toISOString(),
    });
    setPaymentModal(null); setAmount(''); await load();
  };

  const topBalances = useMemo(
    () => ledger.filter((r) => r.balance > 0).sort((a, b) => b.balance - a.balance).slice(0, 6),
    [ledger],
  );

  const sc: any = { paid: 'bg-green-100 text-green-700', partial: 'bg-amber-100 text-amber-700', pending: 'bg-slate-100 text-slate-500', overdue: 'bg-red-100 text-red-700' };
  const filterLabels: Record<Filter, string> = { all: t.allCustomers, 'has-balance': t.withBalance, overdue: t.overdueOnly };

  return (
    <div className={`space-y-6 ${isUrdu ? 'font-urdu' : ''}`}>
      <div className="flex gap-2 flex-wrap">
        {(['all', 'has-balance', 'overdue'] as Filter[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${filter === f ? 'bg-[#2563EB] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {filterLabels[f]}
          </button>
        ))}
      </div>

      {topBalances.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topBalances.map((row: any) => (
            <div key={row.customer_id} className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
              <p className="font-semibold text-slate-800">{localizeApiText(row.customer_name, isUrdu)}</p>
              <div className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">{t.totalOwed}</span><span>{fmtCurrency(row.totalOwed)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t.totalPaid}</span><span className="text-green-600">{fmtCurrency(row.totalPaid)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-1">
                  <span className="font-medium">{t.balance}</span><span className="font-bold text-red-600">{fmtCurrency(row.balance)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl bg-white shadow-sm border border-slate-100">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="font-semibold text-slate-800">{t.customerLedgerTitle}</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {sales.length === 0 ? (
            <p className="px-6 py-4 text-sm text-slate-400">{t.noData}</p>
          ) : sales.map((sale: any) => (
            <div key={sale.id} className="flex items-center justify-between px-6 py-3 text-sm gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-800">{localizeApiText(sale.customer?.name || sale.customer_name || '-', isUrdu)}</p>
                <p className="text-xs text-slate-400">
                  {new Date(sale.date).toLocaleDateString(locale)}
                  {sale.due_date ? ` \u00b7 ${t.dueDate}: ${new Date(sale.due_date).toLocaleDateString(locale)}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right">
                  <p className="text-xs text-slate-400">{t.balance}</p>
                  <p className={`font-semibold ${sale.pending_amount > 0 ? 'text-red-600' : 'text-green-600'}`}>{fmtCurrency(sale.pending_amount)}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${sc[sale.is_overdue ? 'overdue' : sale.status]}`}>
                  {sale.is_overdue ? t.overdue : sale.status === 'paid' ? t.paid : sale.status === 'partial' ? t.partial : t.pending}
                </span>
                {sale.pending_amount > 0 && (
                  <button onClick={() => { setPaymentModal(sale); setAmount(String(sale.pending_amount)); }}
                    className="rounded-lg bg-[#2563EB] px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 whitespace-nowrap">
                    {t.collectPayment}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {paymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setPaymentModal(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-1 text-lg font-bold text-slate-800">{t.collectPayment}</h3>
            <p className="mb-4 text-sm text-slate-500">{localizeApiText(paymentModal.customer?.name || paymentModal.customer_name, isUrdu)} \u00b7 {t.balance}: {fmtCurrency(paymentModal.pending_amount)}</p>
            <label className="mb-1 block text-xs font-medium text-slate-500">{t.collectAmount}</label>
            <input type="number" autoFocus
              className="mb-4 h-12 w-full rounded-lg border border-slate-200 px-4 text-lg font-semibold focus:border-[#2563EB] focus:outline-none"
              value={amount} onChange={(e) => setAmount(e.target.value)} />
            <div className="flex gap-3">
              <button onClick={submitPayment} className="flex-1 rounded-lg bg-[#2563EB] py-2.5 text-sm font-semibold text-white hover:bg-blue-700">{t.collect}</button>
              <button onClick={() => setPaymentModal(null)} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">{t.cancel}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

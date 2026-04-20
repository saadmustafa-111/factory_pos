import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useLang } from '../lib/i18n';
import { localizeApiText } from '../lib/localize';
import { fmtCurrency } from '../lib/utils';

type Filter = 'all' | 'has-balance';

export default function MillLedger() {
  const { t, isUrdu } = useLang();
  const locale = isUrdu ? 'ur-PK' : 'en-PK';
  const [filter, setFilter] = useState<Filter>('all');
  const [rows, setRows] = useState<any[]>([]);
  const [paymentModal, setPaymentModal] = useState<any>(null);
  const [amount, setAmount] = useState('');

  const load = async () => {
    const { data } = await api.get('/mill-payments/ledger');
    setRows(filter === 'has-balance' ? data.filter((r: any) => r.balance > 0) : data);
  };
  useEffect(() => { load(); }, [filter]);

  const submitPayment = async () => {
    if (!paymentModal || !amount) return;
    await api.post('/mill-payments', {
      supplier_id: paymentModal.supplier_id,
      inventory_id: paymentModal.id,
      amount_paid: Number(amount),
      payment_date: new Date().toISOString(),
    });
    setPaymentModal(null); setAmount(''); await load();
  };

  const sc: any = { paid: 'bg-green-100 text-green-700', partial: 'bg-amber-100 text-amber-700', pending: 'bg-slate-100 text-slate-500' };

  return (
    <div className={`space-y-6 ${isUrdu ? 'font-urdu' : ''}`}>
      <div className="flex gap-2">
        {(['all', 'has-balance'] as Filter[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${filter === f ? 'bg-[#2563EB] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {f === 'all' ? t.allSuppliers : t.hasBalance}
          </button>
        ))}
      </div>

      {rows.map((row) => (
        <div key={row.supplier.id} className="rounded-xl bg-white shadow-sm border border-slate-100">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <p className="font-bold text-slate-800 text-base">{localizeApiText(row.supplier.name, isUrdu)}</p>
              {row.supplier.phone && <p className="text-xs text-slate-400">{row.supplier.phone}</p>}
            </div>
            <div className="flex gap-6 text-sm">
              <div className="text-center">
                <p className="text-xs text-slate-400">{t.totalPurchased}</p>
                <p className="font-semibold text-slate-700">{fmtCurrency(row.totalPurchased)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-400">{t.amountPaidLabel}</p>
                <p className="font-semibold text-green-600">{fmtCurrency(row.totalPaid)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-400">{t.amountDue}</p>
                <p className={`font-bold ${row.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>{fmtCurrency(row.balance)}</p>
              </div>
            </div>
          </div>
          {row.inventoryRecords.length === 0 ? (
            <p className="px-6 py-4 text-sm text-slate-400">{t.noData}</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {row.inventoryRecords.map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between px-6 py-3 text-sm gap-3">
                  <div>
                    <p className="font-medium text-slate-800">{localizeApiText(inv.product?.name, isUrdu)}</p>
                    <p className="text-xs text-slate-400">{new Date(inv.date).toLocaleDateString(locale)}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-xs text-slate-400">{t.amountDue}</p>
                      <p className={`font-semibold ${inv.amount_pending_to_mill > 0 ? 'text-red-600' : 'text-green-600'}`}>{fmtCurrency(inv.amount_pending_to_mill)}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${sc[inv.payment_status]}`}>
                      {inv.payment_status === 'paid' ? t.paid : inv.payment_status === 'partial' ? t.partial : t.pending}
                    </span>
                    {inv.amount_pending_to_mill > 0 && (
                      <button onClick={() => { setPaymentModal({ ...inv, supplier_id: row.supplier.id }); setAmount(String(inv.amount_pending_to_mill)); }}
                        className="rounded-lg bg-[#1A1F2E] px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap">
                        {t.payMill}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {paymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setPaymentModal(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-1 text-lg font-bold text-slate-800">{t.payMill}</h3>
            <p className="mb-4 text-sm text-slate-500">{localizeApiText(paymentModal.product?.name, isUrdu)} \u00b7 {t.amountDue}: {fmtCurrency(paymentModal.amount_pending_to_mill)}</p>
            <label className="mb-1 block text-xs font-medium text-slate-500">{t.payAmount}</label>
            <input type="number" autoFocus
              className="mb-4 h-12 w-full rounded-lg border border-slate-200 px-4 text-lg font-semibold focus:border-[#2563EB] focus:outline-none"
              value={amount} onChange={(e) => setAmount(e.target.value)} />
            <div className="flex gap-3">
              <button onClick={submitPayment} className="flex-1 rounded-lg bg-[#2563EB] py-2.5 text-sm font-semibold text-white hover:bg-blue-700">{t.pay}</button>
              <button onClick={() => setPaymentModal(null)} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">{t.cancel}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

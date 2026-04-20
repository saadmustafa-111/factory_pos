import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { useLang } from '../lib/i18n';
import { localizeApiText } from '../lib/localize';
import { Product } from '../lib/types';
import { fmtCurrency } from '../lib/utils';

type DraftItem = {
  product_id: number;
  cement_brand_id?: number;
  quantity: number;
  sale_price_per_unit: number;
  total: number;
};

const sel = "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-[#2563EB] focus:outline-none";
const inp = "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-[#2563EB] focus:outline-none";

export default function Sales() {
  const { t, isUrdu } = useLang();
  const locale = isUrdu ? 'ur-PK' : 'en-PK';
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [allSales, setAllSales] = useState<any[]>([]);
  const [draft, setDraft] = useState<DraftItem>({ product_id: 0, quantity: 0, sale_price_per_unit: 0, total: 0 });
  const [sale, setSale] = useState({
    customer_id: 0, customer_name: '', customer_phone: '',
    date: new Date().toISOString().slice(0, 10),
    isCredit: false, credit_days: 0, due_date: '', amount_paid: 0, notes: '',
  });
  const [items, setItems] = useState<DraftItem[]>([]);
  const [savedMsg, setSavedMsg] = useState('');

  const load = async () => {
    const [p, b, c, s] = await Promise.all([
      api.get('/products'), api.get('/cement-brands'), api.get('/customers'), api.get('/sales'),
    ]);
    setProducts(p.data); setBrands(b.data); setCustomers(c.data); setAllSales(s.data);
  };
  useEffect(() => { load(); }, []);

  const selected = products.find((p) => p.id === Number(draft.product_id));
  const addItem = () => {
    if (!draft.product_id || !draft.quantity || !draft.sale_price_per_unit) return;
    const total = Number(draft.quantity) * Number(draft.sale_price_per_unit);
    setItems([...items, { ...draft, total }]);
    setDraft({ product_id: 0, quantity: 0, sale_price_per_unit: 0, total: 0 });
  };

  const grandTotal = useMemo(() => items.reduce((s, i) => s + i.total, 0), [items]);
  const pending = Math.max(0, grandTotal - Number(sale.amount_paid || 0));
  const status = pending === 0 ? 'paid' : sale.amount_paid > 0 ? 'partial' : 'pending';

  const submitSale = async () => {
    if (!items.length) return;
    await api.post('/sales', {
      customer_id: sale.customer_id || undefined,
      customer_name: sale.customer_name || undefined,
      customer_phone: sale.customer_phone || undefined,
      date: sale.date,
      due_date: sale.isCredit ? sale.due_date || undefined : undefined,
      credit_days: sale.isCredit ? Number(sale.credit_days || 0) : undefined,
      paid_amount: Number(sale.amount_paid || 0),
      notes: sale.notes,
      items: items.map((i) => ({
        product_id: i.product_id, cement_brand_id: i.cement_brand_id,
        quantity: Number(i.quantity), sale_price_per_unit: Number(i.sale_price_per_unit),
      })),
    });
    setItems([]);
    setSale({ customer_id: 0, customer_name: '', customer_phone: '', date: new Date().toISOString().slice(0, 10), isCredit: false, credit_days: 0, due_date: '', amount_paid: 0, notes: '' });
    setSavedMsg(t.completeSale + ' \u2713');
    setTimeout(() => setSavedMsg(''), 3000);
    await load();
  };

  const sc: any = { paid: 'bg-green-100 text-green-700', partial: 'bg-amber-100 text-amber-700', pending: 'bg-slate-100 text-slate-500', overdue: 'bg-red-100 text-red-700' };

  return (
    <div className={`space-y-6 ${isUrdu ? 'font-urdu' : ''}`}>
      <div className="rounded-xl bg-white shadow-sm border border-slate-100">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="font-semibold text-slate-800">{t.newSale}</h2>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">{t.selectCustomer}</label>
              <select className={sel} value={sale.customer_id} onChange={(e) => {
                const id = Number(e.target.value);
                const cust = customers.find((c) => c.id === id);
                setSale({ ...sale, customer_id: id, customer_name: cust?.name || '', customer_phone: cust?.phone || '' });
              }}>
                <option value={0}>{t.selectCustomer}</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{localizeApiText(c.name, isUrdu)}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">{t.customerName}</label>
              <input className={inp} placeholder={t.customerName} value={sale.customer_name} onChange={(e) => setSale({ ...sale, customer_name: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">{t.customerPhone}</label>
              <input className={inp} placeholder={t.customerPhone} value={sale.customer_phone} onChange={(e) => setSale({ ...sale, customer_phone: e.target.value })} />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${sale.isCredit ? 'bg-[#2563EB]' : 'bg-slate-200'}`}
                onClick={() => setSale({ ...sale, isCredit: !sale.isCredit, due_date: '' })}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${sale.isCredit ? 'translate-x-6' : 'translate-x-1'}`} />
              </div>
              <span className="text-sm font-medium text-slate-700">{t.creditSale}</span>
            </label>
            {sale.isCredit && (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">{t.creditDays}</label>
                <input type="number" className={`${inp} w-28`} placeholder="30" value={sale.credit_days || ''} onChange={(e) => {
                  const days = Number(e.target.value || 0);
                  const dueDate = days ? new Date(new Date(sale.date).getTime() + days * 86400000).toISOString().slice(0, 10) : '';
                  setSale({ ...sale, credit_days: days, due_date: dueDate });
                }} />
              </div>
            )}
            {sale.isCredit && sale.due_date && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-700">
                {t.dueDate}: <strong>{new Date(sale.due_date).toLocaleDateString(locale)}</strong>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <p className="mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{t.addItem}</p>
            <div className="grid gap-3 sm:grid-cols-5">
              <div>
                <label className="mb-1 block text-xs text-slate-500">{t.selectProduct}</label>
                <select className={sel} value={draft.product_id} onChange={(e) => setDraft({ ...draft, product_id: Number(e.target.value) })}>
                  <option value={0}>{t.selectProduct}</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{localizeApiText(p.name, isUrdu)}</option>)}
                </select>
              </div>
              {selected?.category === 'cement' ? (
                <div>
                  <label className="mb-1 block text-xs text-slate-500">{t.selectBrand}</label>
                  <select className={sel} value={draft.cement_brand_id || 0} onChange={(e) => setDraft({ ...draft, cement_brand_id: Number(e.target.value) })}>
                    <option value={0}>{t.selectBrand}</option>
                    {brands.map((b) => <option key={b.id} value={b.id}>{localizeApiText(b.brand_name, isUrdu)}</option>)}
                  </select>
                </div>
              ) : <div />}
              <div>
                <label className="mb-1 block text-xs text-slate-500">{t.quantity}</label>
                <input type="number" className={inp} placeholder="0" value={draft.quantity || ''} onChange={(e) => setDraft({ ...draft, quantity: Number(e.target.value) })} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">{t.price}</label>
                <input type="number" className={inp} placeholder="0" value={draft.sale_price_per_unit || ''} onChange={(e) => setDraft({ ...draft, sale_price_per_unit: Number(e.target.value) })} />
              </div>
              <div className="flex items-end">
                <button onClick={addItem} className="flex h-10 w-full items-center justify-center gap-1 rounded-lg bg-[#2563EB] text-sm font-medium text-white hover:bg-blue-700">
                  <Plus className="h-4 w-4" /> {t.addItem}
                </button>
              </div>
            </div>
          </div>

          {items.length > 0 && (
            <div className="overflow-auto rounded-lg border border-slate-100">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-2 text-left">{t.product}</th>
                    <th className="px-4 py-2 text-right">{t.quantity}</th>
                    <th className="px-4 py-2 text-right">{t.price}</th>
                    <th className="px-4 py-2 text-right">{t.total}</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-t border-slate-50">
                      <td className="px-4 py-2 font-medium">{localizeApiText(products.find((p) => p.id === item.product_id)?.name, isUrdu)}</td>
                      <td className="px-4 py-2 text-right">{item.quantity}</td>
                      <td className="px-4 py-2 text-right">{fmtCurrency(item.sale_price_per_unit)}</td>
                      <td className="px-4 py-2 text-right font-semibold">{fmtCurrency(item.total)}</td>
                      <td className="px-4 py-2 text-center">
                        <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {items.length > 0 && (
            <div className="flex flex-wrap items-end justify-between gap-4 rounded-lg bg-slate-50 p-4">
              <div>
                <p className="text-xs text-slate-500">{t.totalAmount}</p>
                <p className="text-2xl font-bold text-slate-800">{fmtCurrency(grandTotal)}</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">{t.payNow}</label>
                <input type="number" className={`${inp} w-40`} placeholder="0" value={sale.amount_paid || ''} onChange={(e) => setSale({ ...sale, amount_paid: Number(e.target.value) })} />
              </div>
              <div>
                <p className="text-xs text-slate-500">{t.pendingAmount}</p>
                <p className={`text-2xl font-bold ${pending > 0 ? 'text-red-600' : 'text-green-600'}`}>{fmtCurrency(pending)}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${sc[status]}`}>
                {status === 'paid' ? t.paid : status === 'partial' ? t.partial : t.pending}
              </span>
              <button onClick={submitSale} className="rounded-lg bg-[#2563EB] px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
                {t.completeSale}
              </button>
            </div>
          )}
          {savedMsg && <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-700">{savedMsg}</div>}
        </div>
      </div>

      <div className="rounded-xl bg-white shadow-sm border border-slate-100">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="font-semibold text-slate-800">{t.saleHistory}</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {allSales.length === 0 ? (
            <p className="px-6 py-4 text-sm text-slate-400">{t.noData}</p>
          ) : allSales.slice(0, 30).map((s: any) => (
            <div key={s.id} className="flex items-center justify-between px-6 py-3 text-sm">
              <div>
                <p className="font-medium text-slate-800">{localizeApiText(s.customer?.name || s.customer_name || '-', isUrdu)}</p>
                <p className="text-xs text-slate-400">{new Date(s.date).toLocaleDateString(locale)}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-slate-800">{fmtCurrency(s.total_amount)}</p>
                <span className={`text-xs rounded-full px-2 py-0.5 ${sc[s.is_overdue ? 'overdue' : s.status]}`}>
                  {s.is_overdue ? t.overdue : s.status === 'paid' ? t.paid : s.status === 'partial' ? t.partial : t.pending}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

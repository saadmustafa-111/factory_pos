import { useEffect, useState } from 'react';
import {
  ShoppingCart, Truck, Banknote, TrendingUp, X, ChevronRight, User, Phone,
  Calendar, ArrowRight, Package,
} from 'lucide-react';
import { api } from '../lib/api';
import { useLang } from '../lib/i18n';
import { fmtCurrency } from '../lib/utils';

interface DayRow {
  date: string; sales_count: number; sales_amount: number; cash_received: number;
  credit_given: number; payments_collected: number; stock_added_count: number;
  stock_added_value: number; net_profit: number;
}
interface SaleItem { product: string; qty: number; unit: string; rate: number; total: number; }
interface SaleDetail {
  id: number; customer_name: string; customer_phone: string | null;
  customer_address: string | null; notes: string | null; items: SaleItem[];
  total_amount: number; paid_amount: number; remaining_amount: number;
  payment_type: string; status: string;
}
interface StockMovement { supplier: string; product: string; quantity: number; unit: string; purchase_rate: number; total_value: number; }
interface PaymentDetail { customer_name: string; amount: number; method: string; notes?: string; }
interface DaySummary { total_sales: number; cash_collected: number; credit_given: number; stock_value: number; profit: number; payments_collected: number; }
interface DayDetailData { date: string; sales: SaleDetail[]; stock_movements: StockMovement[]; payments_received: PaymentDetail[]; summary: DaySummary; }

function displayUnit(unit: string, isUrdu: boolean) {
  if (unit === 'maund') return isUrdu ? 'من' : 'Mnd';
  if (unit === 'bag') return isUrdu ? 'بوری' : 'bag';
  if (unit === 'ton') return isUrdu ? 'ٹن' : 'ton';
  return unit;
}
function todayStr() { return new Date().toISOString().slice(0, 10); }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); }
function firstOfMonth() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); }
function firstOfWeek() { const d = new Date(); const day = d.getDay(); d.setDate(d.getDate() - (day === 0 ? 6 : day - 1)); return d.toISOString().slice(0, 10); }
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES_UR = ['اتوار', 'پیر', 'منگل', 'بدھ', 'جمعرات', 'جمعہ', 'ہفتہ'];
function getDayName(dateStr: string, isUrdu: boolean) {
  const d = new Date(dateStr + 'T00:00:00');
  return isUrdu ? DAY_NAMES_UR[d.getDay()] : DAY_NAMES[d.getDay()];
}

function DayDetailDrawer({ date, onClose }: { date: string; onClose: () => void }) {
  const { isUrdu } = useLang();
  const [detail, setDetail] = useState<DayDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'sales' | 'stock' | 'payments'>('sales');
  useEffect(() => {
    setLoading(true);
    api.get<DayDetailData>(`/reports/daily-detail/${date}`)
      .then(res => setDetail(res.data)).finally(() => setLoading(false));
  }, [date]);
  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-black/40 backdrop-blur-sm" />
      <div className={`relative flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl ${isUrdu ? 'font-urdu' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-industrial-700 bg-gradient-to-r from-industrial-800 to-industrial-700 px-6 py-4">
          <div>
            <p className="text-xs text-industrial-300 uppercase tracking-widest">روزنامچہ · Daily Detail</p>
            <h2 className="text-xl font-bold text-white">{getDayName(date, isUrdu)}, {date}</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-industrial-300 hover:bg-industrial-600 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        {loading && <div className="flex-1 flex items-center justify-center"><div className="h-8 w-8 rounded-full border-4 border-industrial-200 border-t-industrial-700 animate-spin" /></div>}
        {detail && (
          <>
            <div className="grid grid-cols-3 gap-px bg-industrial-100 border-b border-industrial-100">
              {[
                { label: 'Total Sales', val: detail.summary.total_sales, color: 'text-blue-700' },
                { label: 'Cash + Collections', val: detail.summary.cash_collected + detail.summary.payments_collected, color: 'text-green-700' },
                { label: 'Credit Given', val: detail.summary.credit_given, color: 'text-amber-700' },
                { label: 'Collections', val: detail.summary.payments_collected, color: 'text-purple-700' },
                { label: 'Stock Value', val: detail.summary.stock_value, color: 'text-industrial-700' },
                { label: 'Net Profit', val: detail.summary.profit, color: detail.summary.profit >= 0 ? 'text-emerald-700' : 'text-red-600' },
              ].map(c => (
                <div key={c.label} className="bg-white px-4 py-3">
                  <p className="text-xs text-industrial-400 font-medium">{c.label}</p>
                  <p className={`text-sm font-bold ${c.color}`}>{fmtCurrency(c.val)}</p>
                </div>
              ))}​
            </div>
            <div className="flex border-b border-industrial-100 bg-industrial-50 px-4">
              {([
                { key: 'sales' as const, label: 'Sales', count: detail.sales.length },
                { key: 'stock' as const, label: 'Stock In', count: detail.stock_movements.length },
                { key: 'payments' as const, label: 'Collections', count: detail.payments_received.length },
              ]).map(tb => (
                <button key={tb.key} onClick={() => setTab(tb.key)}
                  className={`relative px-5 py-3 text-sm font-semibold transition-colors ${tab === tb.key ? 'text-industrial-700' : 'text-industrial-400 hover:text-industrial-600'}`}>
                  {tb.label}
                  <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${tab === tb.key ? 'bg-industrial-700 text-white' : 'bg-industrial-200 text-industrial-500'}`}>{tb.count}</span>
                  {tab === tb.key && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-industrial-700 rounded-full" />}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {tab === 'sales' && (detail.sales.length === 0
                ? <div className="flex flex-col items-center justify-center py-16 text-industrial-300"><ShoppingCart className="h-12 w-12 mb-3" /><p className="text-sm">No sales on this day</p></div>
                : detail.sales.map((sale, idx) => (
                  <div key={sale.id} className="rounded-2xl border border-industrial-100 bg-white shadow-industrial overflow-hidden">
                    <div className={`px-5 pt-4 pb-3 ${sale.payment_type === 'cash' ? 'bg-green-50 border-b border-green-100' : 'bg-amber-50 border-b border-amber-100'}`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-industrial-700 text-xs font-bold text-white shrink-0">{idx + 1}</span>
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${sale.payment_type === 'cash' ? 'bg-green-200 text-green-800' : 'bg-amber-200 text-amber-800'}`}>
                              {sale.payment_type === 'cash' ? '✓ CASH' : '⏱ CREDIT'}
                            </span>
                            {sale.status === 'overdue' && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">OVERDUE</span>}
                          </div>
                          <div className="flex items-center gap-2"><User className="h-4 w-4 text-industrial-400 shrink-0" /><span className="font-bold text-industrial-900 text-base">{sale.customer_name}</span></div>
                          {sale.customer_phone && <div className="flex items-center gap-2 mt-0.5"><Phone className="h-3.5 w-3.5 text-industrial-400 shrink-0" /><span className="text-sm text-industrial-500 font-medium">{sale.customer_phone}</span></div>}
                          {sale.customer_address && <p className="text-xs text-industrial-400 mt-0.5 ml-6">{sale.customer_address}</p>}
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-xl font-black text-industrial-900">{fmtCurrency(sale.total_amount)}</p>
                          {sale.remaining_amount > 0 && <p className="text-sm font-semibold text-amber-700 mt-0.5">باقی {fmtCurrency(sale.remaining_amount)}</p>}
                        </div>
                      </div>
                    </div>
                    <div className="px-5 py-3 divide-y divide-industrial-100">
                      {sale.items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between py-2.5">
                          <div className="flex items-center gap-3">
                            <Package className="h-4 w-4 text-industrial-200 shrink-0" />
                            <div>
                              <p className="font-semibold text-industrial-800 text-sm">{item.product}</p>
                              <p className="text-xs text-industrial-400">{item.qty} {displayUnit(item.unit, isUrdu)} × {fmtCurrency(item.rate)}</p>
                            </div>
                          </div>
                          <span className="font-bold text-industrial-800">{fmtCurrency(item.total)}</span>
                        </div>
                      ))}
                    </div>
                    {sale.notes && <div className="border-t border-industrial-100 bg-industrial-50 px-5 py-2"><p className="text-xs text-industrial-400 italic">{sale.notes}</p></div>}
                  </div>
                ))
              )}
              {tab === 'stock' && (detail.stock_movements.length === 0
                ? <div className="flex flex-col items-center justify-center py-16 text-industrial-300"><Truck className="h-12 w-12 mb-3" /><p className="text-sm">No stock received</p></div>
                : <div className="space-y-3">
                    {detail.stock_movements.map((s, i) => (
                      <div key={i} className="flex items-center justify-between rounded-xl border border-industrial-100 bg-white px-5 py-4 shadow-industrial">
                        <div>
                          <p className="font-bold text-industrial-800">{s.product}</p>
                          <p className="text-xs text-industrial-400 mt-0.5"><span className="font-medium text-industrial-600">{s.supplier}</span> · {s.quantity} {displayUnit(s.unit, isUrdu)} @ {fmtCurrency(s.purchase_rate)}/{displayUnit(s.unit, isUrdu)}</p>
                        </div>
                        <span className="font-bold text-industrial-700 text-base">{fmtCurrency(s.total_value)}</span>
                      </div>
                    ))}
                    <div className="flex justify-end rounded-xl bg-industrial-100 px-5 py-3"><span className="font-bold text-industrial-700">Total: {fmtCurrency(detail.summary.stock_value)}</span></div>
                  </div>
              )}
              {tab === 'payments' && (detail.payments_received.length === 0
                ? <div className="flex flex-col items-center justify-center py-16 text-industrial-300"><Banknote className="h-12 w-12 mb-3" /><p className="text-sm">No payments collected</p></div>
                : <div className="space-y-2">
                    {detail.payments_received.map((p, i) => (
                      <div key={i} className="flex items-center justify-between rounded-xl border border-industrial-100 bg-white px-5 py-3.5 shadow-industrial">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-50 border border-green-200 shrink-0"><Banknote className="h-4 w-4 text-green-600" /></div>
                          <div>
                            <p className="font-semibold text-industrial-800">{p.customer_name}</p>
                            <p className="text-xs text-industrial-400 capitalize">{p.method}{p.notes ? ` · ${p.notes}` : ''}</p>
                          </div>
                        </div>
                        <span className="font-bold text-green-700 text-lg">{fmtCurrency(p.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-end rounded-xl bg-green-50 px-5 py-3 mt-2"><span className="font-bold text-green-700">Total: {fmtCurrency(detail.payments_received.reduce((s, r) => s + r.amount, 0))}</span></div>
                  </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function DailyRegister() {
  const { isUrdu } = useLang();
  const today = todayStr();
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today);
  const [rows, setRows] = useState<DayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailDate, setDetailDate] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<string>('month');

  const load = async (f: string, t2: string) => {
    setLoading(true);
    try { const { data } = await api.get<DayRow[]>(`/reports/daily-register?from=${f}&to=${t2}`); setRows(data); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(from, to); }, [from, to]);

  const setPreset = (preset: string) => {
    setActivePreset(preset);
    if (preset === 'yesterday') { const y = daysAgo(1); setFrom(y); setTo(y); return; }
    let f = today;
    if (preset === 'week') f = firstOfWeek();
    else if (preset === 'month') f = firstOfMonth();
    setFrom(f); setTo(today);
  };

  const totals = rows.reduce((acc, r) => ({
    sales_count: acc.sales_count + r.sales_count, sales_amount: acc.sales_amount + r.sales_amount,
    cash_received: acc.cash_received + r.cash_received, credit_given: acc.credit_given + r.credit_given,
    payments_collected: acc.payments_collected + r.payments_collected,
    stock_added_value: acc.stock_added_value + r.stock_added_value, net_profit: acc.net_profit + r.net_profit,
  }), { sales_count: 0, sales_amount: 0, cash_received: 0, credit_given: 0, payments_collected: 0, stock_added_value: 0, net_profit: 0 });

  const PRESETS = [{ key: 'today', label: 'Today' }, { key: 'yesterday', label: 'Yesterday' }, { key: 'week', label: 'This Week' }, { key: 'month', label: 'This Month' }];

  return (
    <div className={`space-y-0 ${isUrdu ? 'font-urdu' : ''}`}>
      <div className="bg-gradient-to-br from-industrial-800 via-industrial-800 to-industrial-900 px-6 py-6 rounded-2xl shadow-industrial-lg">
        <div className="max-w-full mx-auto">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 border border-white/20"><Calendar className="h-6 w-6 text-white" /></div>
              <div>
                <h1 className="text-2xl font-black text-white leading-tight">روزنامچہ</h1>
                <p className="text-sm text-industrial-300 font-medium">Daily Business Register</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-3">
              <div className="flex rounded-xl bg-white/10 p-1 gap-1">
                {PRESETS.map(p => (
                  <button key={p.key} onClick={() => setPreset(p.key)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${activePreset === p.key ? 'bg-white text-industrial-800 shadow-md' : 'text-white/60 hover:text-white hover:bg-white/10'}`}>
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input type="date" value={from} onChange={e => { setFrom(e.target.value); setActivePreset('custom'); }} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:bg-white/20 focus:outline-none" />
                <ArrowRight className="h-4 w-4 text-white/40" />
                <input type="date" value={to} onChange={e => { setTo(e.target.value); setActivePreset('custom'); }} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:bg-white/20 focus:outline-none" />
              </div>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { icon: ShoppingCart, label: 'Total Sales', val: totals.sales_amount, textC: 'text-blue-300', borderC: 'border-blue-400/30' },
              { icon: Banknote, label: 'Cash Received', val: totals.cash_received, textC: 'text-green-300', borderC: 'border-green-400/30' },
              { icon: Banknote, label: 'Collections', val: totals.payments_collected, textC: 'text-purple-300', borderC: 'border-purple-400/30' },
              { icon: Truck, label: 'Stock In', val: totals.stock_added_value, textC: 'text-industrial-300', borderC: 'border-industrial-400/30' },
              { icon: TrendingUp, label: 'Net Profit', val: totals.net_profit, textC: totals.net_profit >= 0 ? 'text-emerald-300' : 'text-red-300', borderC: totals.net_profit >= 0 ? 'border-emerald-400/30' : 'border-red-400/30' },
            ].map(c => { const Icon = c.icon; return (
              <div key={c.label} className={`rounded-xl border ${c.borderC} px-4 py-3 bg-black/10`}>
                <div className="flex items-center gap-2 mb-1"><Icon className={`h-3.5 w-3.5 ${c.textC}`} /><p className="text-xs text-white/50 font-medium">{c.label}</p></div>
                <p className={`text-lg font-black ${c.textC}`}>{fmtCurrency(c.val)}</p>
              </div>
            ); })}
          </div>
        </div>
      </div>
      <div className="max-w-full mx-auto py-4">
        {loading ? (
          <div className="flex items-center justify-center py-24"><div className="h-10 w-10 rounded-full border-4 border-industrial-200 border-t-industrial-700 animate-spin" /></div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-industrial-200 bg-white py-24 text-industrial-400">
            <Calendar className="h-16 w-16 opacity-20 mb-4" /><p className="text-lg font-semibold">No records in this period</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-industrial-200 bg-white shadow-industrial">
            <div className="hidden lg:grid grid-cols-[200px_50px_1fr_1fr_1fr_1fr_1fr_1fr_44px] border-b-2 border-industrial-100 bg-industrial-50 px-4 py-3">
              {['Date', '#', 'Sales Amt', 'Cash In', 'Credit', 'Collections', 'Stock In', 'Profit', ''].map((h, i) => (
                <div key={i} className={`text-xs font-bold uppercase tracking-widest text-industrial-400 ${i > 1 ? 'text-right' : i === 1 ? 'text-center' : ''}`}>{h}</div>
              ))}
            </div>
            {rows.map((row, idx) => {
              const dayName = getDayName(row.date, isUrdu);
              const isFriday = new Date(row.date + 'T00:00:00').getDay() === 5;
              const isToday = row.date === today;
              return (
                <div key={row.date} onClick={() => setDetailDate(row.date)}
                  className={`group grid grid-cols-[200px_50px_1fr_1fr_1fr_1fr_1fr_1fr_44px] items-center px-4 py-3.5 cursor-pointer border-b border-industrial-100 hover:bg-accent-primary/5 transition-all ${idx % 2 !== 0 ? 'bg-industrial-50/40' : ''} ${isToday ? 'ring-1 ring-inset ring-accent-primary/30' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className={`flex flex-col items-center justify-center rounded-xl w-12 h-12 shrink-0 shadow-industrial ${isFriday ? 'bg-emerald-600' : isToday ? 'bg-accent-primary' : 'bg-industrial-800'} text-white`}>
                      <span className="text-[10px] font-bold opacity-80">{dayName}</span>
                      <span className="text-xl font-black leading-none">{row.date.slice(8)}</span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-industrial-500">{row.date.slice(0, 7)}</p>
                      {isToday && <span className="text-xs font-bold text-accent-primary">Today</span>}
                    </div>
                  </div>
                  <div className="text-center"><span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent-primary/10 text-sm font-black text-accent-primary group-hover:bg-accent-primary/20">{row.sales_count}</span></div>
                  <div className="text-right pr-2 font-semibold text-industrial-800">{fmtCurrency(row.sales_amount)}</div>
                  <div className="text-right pr-2"><span className="font-bold text-green-700">{fmtCurrency(row.cash_received)}</span></div>
                  <div className="text-right pr-2">{row.credit_given > 0 ? <span className="font-bold text-amber-700">{fmtCurrency(row.credit_given)}</span> : <span className="text-industrial-200">—</span>}</div>
                  <div className="text-right pr-2">{row.payments_collected > 0 ? <span className="font-bold text-purple-700">{fmtCurrency(row.payments_collected)}</span> : <span className="text-industrial-200">—</span>}</div>
                  <div className="text-right pr-2">{row.stock_added_count > 0 ? <div><p className="font-semibold text-industrial-700">{fmtCurrency(row.stock_added_value)}</p><p className="text-xs text-industrial-400">{row.stock_added_count}×</p></div> : <span className="text-industrial-200">—</span>}</div>
                  <div className="text-right pr-2"><span className={`font-black text-base ${row.net_profit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{fmtCurrency(row.net_profit)}</span></div>
                  <div className="flex items-center justify-center"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-industrial-100 text-industrial-400 group-hover:bg-industrial-700 group-hover:text-white transition-all"><ChevronRight className="h-4 w-4" /></div></div>
                </div>
              );
            })}
            <div className="grid grid-cols-[200px_50px_1fr_1fr_1fr_1fr_1fr_1fr_44px] items-center border-t-2 border-industrial-200 bg-industrial-800 px-4 py-4">
              <div className="text-sm font-black text-white">Total · {rows.length} days</div>
              <div className="text-center"><span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-sm font-black text-white">{totals.sales_count}</span></div>
              <div className="text-right pr-2 font-bold text-white">{fmtCurrency(totals.sales_amount)}</div>
              <div className="text-right pr-2 font-bold text-green-300">{fmtCurrency(totals.cash_received)}</div>
              <div className="text-right pr-2 font-bold text-amber-300">{fmtCurrency(totals.credit_given)}</div>
              <div className="text-right pr-2 font-bold text-purple-300">{fmtCurrency(totals.payments_collected)}</div>
              <div className="text-right pr-2 font-bold text-industrial-300">{fmtCurrency(totals.stock_added_value)}</div>
              <div className={`text-right pr-2 font-black text-lg ${totals.net_profit >= 0 ? 'text-emerald-300' : 'text-red-400'}`}>{fmtCurrency(totals.net_profit)}</div>
              <div />
            </div>
          </div>
        )}
      </div>
      {detailDate && <DayDetailDrawer date={detailDate} onClose={() => setDetailDate(null)} />}
    </div>
  );
}

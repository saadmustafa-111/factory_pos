import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, ArrowUpRight, Building2, TrendingUp, Users, Wallet, ShoppingCart, TrendingDown, Minus, Eye, EyeOff } from 'lucide-react';
import { api } from '../lib/api';
import { useLang } from '../lib/i18n';
import { localizeApiText } from '../lib/localize';
import { fmtCurrency } from '../lib/utils';
import { BackupWarningBanner } from '../components/BackupWarningBanner';

const PIE_COLORS = ['#2563eb', '#0891b2', '#7c3aed', '#059669', '#d97706', '#dc2626'];

function KpiCard({ label, value, icon: Icon, iconColor, trend, hidden }: { label: string; value: string; icon: any; iconColor: string; trend?: 'up' | 'down' | 'neutral'; hidden?: boolean }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-white border border-slate-200 px-5 py-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: `${iconColor}12` }}>
          <Icon className="h-4 w-4" style={{ color: iconColor }} />
        </div>
      </div>
      <p className="text-2xl font-black text-slate-800 leading-none">{hidden ? '••••••' : value}</p>
      {trend && (
        <div className={`flex items-center gap-1 text-xs font-semibold ${trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-500' : 'text-slate-400'}`}>
          {trend === 'up' ? <ArrowUpRight className="h-3 w-3" /> : trend === 'down' ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
        </div>
      )}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg text-sm">
      <p className="font-bold text-slate-700 mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full inline-block" style={{ background: p.fill }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-bold text-slate-800">{fmtCurrency(p.value)}</span>
        </p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [stripHidden, setStripHidden] = useState(() => localStorage.getItem('dash-strip-hidden') === 'true');
  const [cardsHidden, setCardsHidden] = useState(() => localStorage.getItem('dash-cards-hidden') === 'true');

  const toggleStrip = (val: boolean) => { setStripHidden(val); localStorage.setItem('dash-strip-hidden', String(val)); };
  const toggleCards = (val: boolean) => { setCardsHidden(val); localStorage.setItem('dash-cards-hidden', String(val)); };
  const { t, isUrdu } = useLang();
  const locale = isUrdu ? 'ur-PK' : 'en-PK';

  useEffect(() => {
    api.get('/reports/dashboard').then((res) => setData(res.data));
  }, []);

  if (!data) return <div className={`text-center py-10 text-slate-400 ${isUrdu ? 'font-urdu' : ''}`}>{t.loading}</div>;

  const salesData = (data.recentSales || [])
    .slice(0, 10)
    .map((s: any) => ({
      date: new Date(s.date).toLocaleDateString(locale, { month: 'short', day: 'numeric' }),
      total: Number(s.total_amount),
      paid: Number(s.paid_amount),
    }));

  const stockData = (data.stockSummary || [])
    .filter((s: any) => Number(s.current_stock ?? s.stock) > 0)
    .slice(0, 6)
    .map((s: any) => ({
      name: localizeApiText(s.product_name ?? s.product?.name ?? 'Unknown', isUrdu).substring(0, 12),
      value: Number(s.current_stock ?? s.stock),
    }));

  const todayNet = data.todayNet ?? 0;

  return (
    <div className={`space-y-6 ${isUrdu ? 'font-urdu' : ''}`}>
      <BackupWarningBanner />

      {/* ── TODAY SUMMARY STRIP ── */}
      <div className="rounded-2xl bg-slate-900 shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <span className="text-[10px] font-black text-amber-400 leading-none">PKR</span>
            </div>
            <h2 className="text-sm font-bold text-white tracking-wide">{t.todayNetTitle}</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-400">
              {new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
            <button
              onClick={() => toggleStrip(!stripHidden)}
              className="flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors"
            >
              {stripHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              {stripHidden ? 'Show' : 'Hide'}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-white/5" style={{ borderTop: 'none' }}>
          {[
            { label: t.todayRevenue, value: data.todaySales, icon: ArrowUpRight, color: '#34d399' },
            { label: t.todayStockCost, value: data.todayStockCost ?? 0, icon: ShoppingCart, color: '#fbbf24' },
            { label: t.todayMillPaid, value: data.todayMillPaid ?? 0, icon: TrendingDown, color: '#f87171' },
            { label: t.todayManualExpenses, value: data.todayManualExpenses ?? 0, icon: Wallet, color: '#a78bfa' },
            { label: t.todayNet, value: todayNet, icon: TrendingUp, color: todayNet >= 0 ? '#34d399' : '#f87171', highlight: true },
          ].map(({ label, value, icon: Icon, color, highlight }) => (
            <div key={label} className={`flex flex-col gap-1 px-6 py-5 ${highlight ? 'bg-white/5' : ''}`}>
              <div className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5" style={{ color }} />
                <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: `${color}aa` }}>{label}</p>
              </div>
              <p className="text-xl font-black" style={{ color }}>{stripHidden ? '••••••' : fmtCurrency(value)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── KPI CARDS ── */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Key Metrics</p>
          <button
            onClick={() => toggleCards(!cardsHidden)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500 transition-colors"
          >
            {cardsHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            {cardsHidden ? 'Show' : 'Hide'}
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 p-4">
        <KpiCard label={t.todaySales}      value={fmtCurrency(data.todaySales)}          icon={ArrowUpRight} iconColor="#2563eb" hidden={cardsHidden} />
        <KpiCard label={t.monthlySales}    value={fmtCurrency(data.monthSales)}           icon={TrendingUp}   iconColor="#059669" hidden={cardsHidden} />
        <KpiCard label={t.totalProfit}     value={fmtCurrency(data.totalProfit)}          icon={Wallet}       iconColor="#7c3aed" hidden={cardsHidden} />
        <KpiCard label={t.customerPending} value={fmtCurrency(data.customerPending)}      icon={Users}        iconColor="#d97706" hidden={cardsHidden} />
        <KpiCard label={t.millDues}        value={fmtCurrency(data.millDues)}             icon={Building2}    iconColor="#0891b2" hidden={cardsHidden} />
        <KpiCard label={t.overdueCount}    value={String(data.overdueCount ?? 0)}         icon={AlertTriangle} iconColor={data.overdueCount > 0 ? '#dc2626' : '#059669'} />
        </div>
      </div>

      {/* ── CHARTS ROW ── */}
      <div className={`grid gap-6 ${stockData.length > 0 ? 'lg:grid-cols-3' : 'lg:grid-cols-1'}`}>

        {/* Bar chart */}
        {salesData.length > 0 && (
          <div className={`rounded-2xl bg-white border border-slate-200 shadow-sm p-6 ${stockData.length > 0 ? 'lg:col-span-2' : ''}`}>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-800">{t.weeklySalesChart}</h2>
                <p className="text-xs text-slate-400 mt-0.5">Last {salesData.length} transactions</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm inline-block bg-slate-800"/>{t.total}</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm inline-block bg-emerald-500"/>{t.paid}</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={salesData} barCategoryGap="35%" margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="total" name={t.total} fill="#1e293b" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="paid"  name={t.paid}  fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Pie chart */}
        {stockData.length > 0 && (
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
            <div className="mb-5">
              <h2 className="text-sm font-bold text-slate-800">{t.stockChart}</h2>
              <p className="text-xs text-slate-400 mt-0.5">Current stock levels</p>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={stockData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" nameKey="name" paddingAngle={3}>
                  {stockData.map((_: any, i: number) => (
                    <Cell key={`cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any, name: any) => [v.toLocaleString(), name]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-3 space-y-1.5">
              {stockData.slice(0, 4).map((d: any, i: number) => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-slate-600 truncate max-w-[100px]">{d.name}</span>
                  </div>
                  <span className="font-semibold text-slate-700">{d.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── OVERDUE ALERTS ── */}
      {data.overdueSales?.length > 0 && (
        <div className="rounded-2xl bg-white border border-red-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-red-100 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <h2 className="text-sm font-bold text-red-700">{t.overdueAlerts} · {data.overdueSales.length}</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {data.overdueSales.slice(0, 5).map((sale: any) => (
              <div key={sale.id} className="flex items-center justify-between px-6 py-3">
                <span className="text-sm font-semibold text-slate-700">{localizeApiText(sale.customer?.name || sale.customer_name || '—', isUrdu)}</span>
                <span className="text-sm font-black text-red-600">{fmtCurrency(sale.pending_amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── RECENT SALES ── */}
      {data.recentSales?.length > 0 && (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-800">{t.recentSales}</h2>
            <span className="text-xs text-slate-400">{data.recentSales.length} transactions</span>
          </div>
          <div className="divide-y divide-slate-100">
            {data.recentSales.slice(0, 8).map((s: any) => (
              <div key={s.id} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                    {(s.customer?.name || s.customer_name || 'W').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{localizeApiText(s.customer?.name || s.customer_name || '—', isUrdu)}</p>
                    <p className="text-xs text-slate-400">{new Date(s.date).toLocaleDateString(locale, { day: '2-digit', month: 'short' })}</p>
                  </div>
                </div>
                <span className="text-sm font-black text-slate-800">{fmtCurrency(s.total_amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

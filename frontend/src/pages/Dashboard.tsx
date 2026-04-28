import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts';
import { AlertTriangle, ArrowUpRight, Building2, TrendingUp, Users, Wallet, ShoppingCart, TrendingDown, DollarSign } from 'lucide-react';
import { api } from '../lib/api';
import { useLang } from '../lib/i18n';
import { localizeApiText } from '../lib/localize';
import { fmtCurrency } from '../lib/utils';
import { BackupWarningBanner } from '../components/BackupWarningBanner';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#64748b'];

function StatCard({ label, value, sub, icon: Icon, color }: any) {
  return (
    <div className="industrial-card p-6 rounded-xl">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-industrial" style={{ background: `${color}20` }}>
          <Icon className="h-6 w-6" style={{ color }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-industrial-600 truncate">{label}</p>
          <p className="mt-1 text-2xl font-bold text-industrial-900 truncate">{value}</p>
          {sub && <p className="mt-1 text-sm text-industrial-500">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const { t, isUrdu } = useLang();
  const locale = isUrdu ? 'ur-PK' : 'en-PK';

  useEffect(() => {
    api.get('/reports/dashboard').then((res) => setData(res.data));
  }, []);

  if (!data) return <div className={`text-center py-10 ${isUrdu ? 'font-urdu' : ''}`}>{t.loading}</div>;

  const salesData = (data.recentSales || [])
    .slice(0, 10)
    .map((s: any) => ({ date: new Date(s.date).toLocaleDateString(locale, { month: 'short', day: 'numeric' }), total: Number(s.total_amount), paid: Number(s.paid_amount) }));

  const stockData = (data.stockSummary || [])
    .filter((s: any) => Number(s.current_stock ?? s.stock) > 0)
    .slice(0, 5)
    .map((s: any) => ({ name: localizeApiText(s.product_name ?? s.product?.name ?? 'Unknown', isUrdu).substring(0, 10), value: Number(s.current_stock ?? s.stock) }));

  return (
    <div className={`space-y-6 ${isUrdu ? 'font-urdu' : ''}`}>
      <BackupWarningBanner />

      {/* ── TODAY'S NET SUMMARY ─────────────────────────────────────────── */}
      <div className="rounded-2xl border-2 border-industrial-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 bg-industrial-800 px-6 py-4">
          <DollarSign className="h-5 w-5 text-white" />
          <h2 className="text-base font-bold text-white tracking-wide">{t.todayNetTitle}</h2>
          <span className="ml-auto text-xs text-industrial-300">{new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-industrial-100 sm:grid-cols-3 lg:grid-cols-5 sm:divide-y-0">
          {/* Revenue */}
          <div className="flex flex-col gap-1 px-6 py-5">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-industrial-500">
              <ArrowUpRight className="h-3.5 w-3.5 text-green-500" />
              {t.todayRevenue}
            </div>
            <p className="text-2xl font-black text-green-600">{fmtCurrency(data.todaySales)}</p>
          </div>
          {/* Stock cost */}
          <div className="flex flex-col gap-1 px-6 py-5">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-industrial-500">
              <ShoppingCart className="h-3.5 w-3.5 text-amber-500" />
              {t.todayStockCost}
            </div>
            <p className="text-2xl font-black text-amber-600">{fmtCurrency(data.todayStockCost ?? 0)}</p>
          </div>
          {/* Mill payments */}
          <div className="flex flex-col gap-1 px-6 py-5">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-industrial-500">
              <TrendingDown className="h-3.5 w-3.5 text-red-500" />
              {t.todayMillPaid}
            </div>
            <p className="text-2xl font-black text-red-600">{fmtCurrency(data.todayMillPaid ?? 0)}</p>
          </div>
          {/* Other expenses */}
          <div className="flex flex-col gap-1 px-6 py-5">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-industrial-500">
              <Wallet className="h-3.5 w-3.5 text-purple-500" />
              {t.todayManualExpenses}
            </div>
            <p className="text-2xl font-black text-purple-600">{fmtCurrency(data.todayManualExpenses ?? 0)}</p>
            {data.todayExpenseBreakdown && Object.keys(data.todayExpenseBreakdown).length > 0 && (
              <div className="mt-1 space-y-0.5">
                {Object.entries(data.todayExpenseBreakdown as Record<string, number>).map(([cat, amt]) => (
                  <p key={cat} className="text-xs text-industrial-400 capitalize">{cat}: {fmtCurrency(amt)}</p>
                ))}
              </div>
            )}
          </div>
          {/* Net */}
          <div className={`flex flex-col gap-1 px-6 py-5 ${
            (data.todayNet ?? 0) >= 0 ? 'bg-green-50' : 'bg-red-50'
          }`}>
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-industrial-500">
              <TrendingUp className="h-3.5 w-3.5" />
              {t.todayNet}
            </div>
            <p className={`text-2xl font-black ${
              (data.todayNet ?? 0) >= 0 ? 'text-green-700' : 'text-red-700'
            }`}>{fmtCurrency(data.todayNet ?? 0)}</p>
            <p className="text-xs text-industrial-400">{t.todayNetDesc}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label={t.todaySales} value={fmtCurrency(data.todaySales)} icon={ArrowUpRight} color="#2563EB" />
        <StatCard label={t.monthlySales} value={fmtCurrency(data.monthSales)} icon={TrendingUp} color="#16A34A" />
        <StatCard label={t.totalProfit} value={fmtCurrency(data.totalProfit)} icon={Wallet} color="#8B5CF6" />
        <StatCard label={t.customerPending} value={fmtCurrency(data.customerPending)} icon={Users} color="#F59E0B" />
        <StatCard label={t.millDues} value={fmtCurrency(data.millDues)} icon={Building2} color="#06B6D4" />
        <StatCard label={t.overdueCount} value={String(data.overdueCount ?? 0)} sub={data.overdueCount > 0 ? t.overdue : t.paid} icon={AlertTriangle} color={data.overdueCount > 0 ? '#DC2626' : '#16A34A'} />
      </div>

      {salesData.length > 0 && (
        <div className="industrial-card p-6 rounded-xl">
          <h2 className="mb-6 text-lg font-bold text-industrial-900">{t.weeklySalesChart}</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={salesData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip formatter={(v: any) => fmtCurrency(v)} />
              <Legend />
              <Bar dataKey="total" name={t.total} fill="#10b981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="paid" name={t.paid} fill="#f59e0b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {stockData.length > 0 && (
        <div className="industrial-card p-6 rounded-xl">
          <h2 className="mb-6 text-lg font-bold text-industrial-900">{t.stockChart}</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={stockData} cx="50%" cy="50%" outerRadius={90} dataKey="value" nameKey="name" label>
                {stockData.map((_: any, i: number) => (
                  <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {data.overdueSales?.length > 0 && (
        <div className="rounded-xl bg-red-50 border-2 border-red-200 shadow-industrial">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-red-200 bg-red-100">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h2 className="text-lg font-bold text-red-800">{t.overdueAlerts} ({data.overdueSales.length})</h2>
          </div>
          <div className="divide-y divide-red-100">
            {data.overdueSales.slice(0, 5).map((sale: any) => (
              <div key={sale.id} className="px-6 py-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-red-900">{localizeApiText(sale.customer?.name || sale.customer_name || '-', isUrdu)}</span>
                  <span className="text-lg font-bold text-red-700">{fmtCurrency(sale.pending_amount)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.recentSales?.length > 0 && (
        <div className="industrial-card rounded-xl">
          <div className="border-b border-industrial-200 px-6 py-4 bg-industrial-50">
            <h2 className="text-lg font-bold text-industrial-900">{t.recentSales}</h2>
          </div>
          <div className="divide-y divide-industrial-100">
            {data.recentSales.slice(0, 10).map((s: any) => (
              <div key={s.id} className="flex justify-between items-center px-6 py-3">
                <span className="font-medium text-industrial-800">{localizeApiText(s.customer?.name || s.customer_name || '-', isUrdu)}</span>
                <span className="text-lg font-bold text-accent-primary">{fmtCurrency(s.total_amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

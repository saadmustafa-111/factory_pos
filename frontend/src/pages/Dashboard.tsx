import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts';
import { AlertTriangle, ArrowUpRight, Building2, TrendingUp, Users, Wallet } from 'lucide-react';
import { api } from '../lib/api';
import { useLang } from '../lib/i18n';
import { localizeApiText } from '../lib/localize';
import { fmtCurrency } from '../lib/utils';

const COLORS = ['#2563EB', '#16A34A', '#F59E0B', '#DC2626', '#8B5CF6', '#06B6D4'];

function StatCard({ label, value, sub, icon: Icon, color }: any) {
  return (
    <div className="flex items-start gap-4 rounded-xl bg-white p-5 shadow-sm border border-slate-100">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg" style={{ background: `${color}20` }}>
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-500 truncate">{label}</p>
        <p className="mt-0.5 text-xl font-bold text-slate-800 truncate">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label={t.todaySales} value={fmtCurrency(data.todaySales)} icon={ArrowUpRight} color="#2563EB" />
        <StatCard label={t.monthlySales} value={fmtCurrency(data.monthSales)} icon={TrendingUp} color="#16A34A" />
        <StatCard label={t.totalProfit} value={fmtCurrency(data.totalProfit)} icon={Wallet} color="#8B5CF6" />
        <StatCard label={t.customerPending} value={fmtCurrency(data.customerPending)} icon={Users} color="#F59E0B" />
        <StatCard label={t.millDues} value={fmtCurrency(data.millDues)} icon={Building2} color="#06B6D4" />
        <StatCard label={t.overdueCount} value={String(data.overdueCount ?? 0)} sub={data.overdueCount > 0 ? t.overdue : t.paid} icon={AlertTriangle} color={data.overdueCount > 0 ? '#DC2626' : '#16A34A'} />
      </div>

      {salesData.length > 0 && (
        <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">{t.weeklySalesChart}</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={salesData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any) => fmtCurrency(v)} />
              <Legend />
              <Bar dataKey="total" name={t.total} fill="#2563EB" radius={[4, 4, 0, 0]} />
              <Bar dataKey="paid" name={t.paid} fill="#16A34A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {stockData.length > 0 && (
        <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">{t.stockChart}</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={stockData} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name" label>
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
        <div className="rounded-xl bg-red-50 border border-red-100 shadow-sm">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-red-200">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <h2 className="text-sm font-semibold text-red-700">{t.overdueAlerts} ({data.overdueSales.length})</h2>
          </div>
          <div className="divide-y divide-red-100">
            {data.overdueSales.slice(0, 5).map((sale: any) => (
              <div key={sale.id} className="px-5 py-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">{localizeApiText(sale.customer?.name || sale.customer_name || '-', isUrdu)}</span>
                  <span className="text-red-600">{fmtCurrency(sale.pending_amount)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.recentSales?.length > 0 && (
        <div className="rounded-xl bg-white shadow-sm border border-slate-100">
          <div className="border-b border-slate-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-slate-700">{t.recentSales}</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {data.recentSales.slice(0, 10).map((s: any) => (
              <div key={s.id} className="flex justify-between px-5 py-2 text-sm">
                <span>{localizeApiText(s.customer?.name || s.customer_name || '-', isUrdu)}</span>
                <span className="font-semibold">{fmtCurrency(s.total_amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

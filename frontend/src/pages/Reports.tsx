import { useState, useEffect } from 'react';
import { TrendingUp, AlertCircle, Building2, FileDown } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { api } from '../lib/api';
import { useLang } from '../lib/i18n';
import { localizeApiText, localizeApiUnit } from '../lib/localize';
import { fmtCurrency } from '../lib/utils';
import { downloadReportPdf } from '../lib/pdfExports';

export default function Reports() {
  const { t, isUrdu } = useLang();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [dashboard, setDashboard] = useState<any>(null);
  const [profitRows, setProfitRows] = useState<any[]>([]);
  const [profitSummary, setProfitSummary] = useState<{ totalExpenses: number; grossProfit: number; netProfit: number } | null>(null);
  const [stockRows, setStockRows] = useState<any[]>([]);
  const [salesRows, setSalesRows] = useState<any[]>([]);

  const load = async (fromDate?: string, toDate?: string) => {
    const [dashRes, stockRes, profitRes, salesRes] = await Promise.all([
      api.get('/reports/dashboard'),
      api.get('/reports/stock'),
      api.get('/reports/profit', { params: { from: fromDate || undefined, to: toDate || undefined } }),
      api.get('/sales', { params: { status: 'all' } }),
    ]);
    setDashboard(dashRes.data);
    setStockRows(stockRes.data);
    const profitData = profitRes.data;
    setProfitRows(profitData.rows ?? profitData);
    if (profitData.rows !== undefined) {
      setProfitSummary({ totalExpenses: profitData.totalExpenses, grossProfit: profitData.grossProfit, netProfit: profitData.netProfit });
    }
    setSalesRows(salesRes.data);
  };

  useEffect(() => {
    load();
  }, []);

  if (!dashboard) return <div className={isUrdu ? 'font-urdu' : ''}>{t.loadingReports}</div>;

  const totalSales = profitRows.reduce((sum, row) => sum + row.sales, 0);
  const grossProfit = profitSummary?.grossProfit ?? profitRows.reduce((sum, row) => sum + row.profit, 0);
  const totalExpenses = profitSummary?.totalExpenses ?? 0;
  const netProfit = profitSummary?.netProfit ?? grossProfit;
  const totalProfit = netProfit;
  const topCustomers = Object.values(
    salesRows.reduce((acc: Record<string, { name: string; total: number }>, row: any) => {
      const key = row.customer?.name || row.customer_name || 'Walk-in';
      const existing = acc[key] || { name: key, total: 0 };
      existing.total += row.total_amount;
      acc[key] = existing;
      return acc;
    }, {}),
  )
    .sort((a: any, b: any) => b.total - a.total)
    .slice(0, 5);

  return (
    <div className={`flex flex-col h-[calc(100vh-9rem)] gap-3 ${isUrdu ? 'font-urdu' : ''}`}>
      {/* Date filter */}
      <div className="flex flex-wrap items-end gap-4 shrink-0 rounded-xl border-2 border-industrial-200 bg-white px-4 py-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-industrial-700">{t.fromDate}</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-industrial-700">{t.toDate}</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button onClick={() => load(from, to)} className="h-10">
          {t.applyFilter}
        </Button>
        <Button
          variant="outline"
          className="h-10 ml-auto flex items-center gap-2 border-industrial-300 text-industrial-700 hover:bg-industrial-50"
          onClick={() =>
            downloadReportPdf({
              from: from || undefined,
              to: to || undefined,
              summary: {
                totalSales,
                totalProfit: grossProfit,
                totalExpenses,
                netProfit,
                customerReceivable: dashboard.customerPending,
                millPayable: dashboard.millDues,
              },
              profitRows,
              stockRows,
              topCustomers,
            })
          }
        >
          <FileDown className="h-4 w-4" />
          {t.downloadPdfReport}
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 md:grid-cols-3 shrink-0">
        {[
          { icon: TrendingUp, label: t.totalSales, val: totalSales, color: '#10b981' },
          { icon: AlertCircle, label: t.customerReceivable, val: dashboard.customerPending, color: '#ef4444' },
          { icon: Building2, label: t.millPayable, val: dashboard.millDues, color: '#f59e0b' },
        ].map(({ icon: Icon, label, val, color }) => (
          <div key={label} className="industrial-card p-5 rounded-xl flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${color}20` }}>
              <Icon className="h-5 w-5" style={{ color }} />
            </div>
            <div>
              <p className="text-xs font-medium text-industrial-600">{label}</p>
              <p className="mt-0.5 text-xl font-bold text-industrial-900">{fmtCurrency(val)}</p>
            </div>
          </div>
        ))}
      </div>
      {/* Profit breakdown card */}
      <div className="industrial-card rounded-xl shrink-0 overflow-hidden border-2 border-green-200">
        <div className="bg-green-700 px-5 py-2">
          <h2 className="text-sm font-bold text-white">Profit Summary</h2>
        </div>
        <div className="grid grid-cols-3 divide-x divide-industrial-100">
          <div className="px-5 py-4">
            <p className="text-xs font-medium text-industrial-600">Gross Profit</p>
            <p className="mt-0.5 text-xl font-bold text-green-700">{fmtCurrency(grossProfit)}</p>
          </div>
          <div className="px-5 py-4">
            <p className="text-xs font-medium text-industrial-600">Total Expenses</p>
            <p className="mt-0.5 text-xl font-bold text-red-600">- {fmtCurrency(totalExpenses)}</p>
          </div>
          <div className="px-5 py-4 bg-green-50">
            <p className="text-xs font-medium text-green-800">Net Profit (After Expenses)</p>
            <p className={`mt-0.5 text-xl font-bold ${netProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmtCurrency(netProfit)}</p>
          </div>
        </div>
      </div>

      {/* Tables panel — scrollable tabs */}
      <div className="flex-1 flex flex-col gap-3 overflow-y-auto min-h-0">
        {/* Product Profit Table */}
        <div className="rounded-xl border-2 border-industrial-200 bg-white overflow-hidden shrink-0">
          <div className="bg-industrial-800 px-5 py-3">
            <h2 className="text-sm font-bold text-white">{t.productWiseSalesProfit}</h2>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-industrial-700 text-white">
                <tr>
                  <th className="px-5 py-2.5 text-left text-xs font-bold uppercase tracking-wider">{t.product}</th>
                  <th className="px-5 py-2.5 text-right text-xs font-bold uppercase tracking-wider">{t.quantity}</th>
                  <th className="px-5 py-2.5 text-right text-xs font-bold uppercase tracking-wider">{t.purchasedPKR}</th>
                  <th className="px-5 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Gross Sold</th>
                  <th className="px-5 py-2.5 text-right text-xs font-bold uppercase tracking-wider text-yellow-300">Discount</th>
                  <th className="px-5 py-2.5 text-right text-xs font-bold uppercase tracking-wider">{t.soldPKR}</th>
                  <th className="px-5 py-2.5 text-right text-xs font-bold uppercase tracking-wider">{t.profit}</th>
                </tr>
              </thead>
              <tbody>
                {profitRows.map((row, idx) => (
                  <tr key={idx} className={`border-t border-industrial-100 hover:bg-accent-primary/5 ${idx % 2 !== 0 ? 'bg-industrial-50/40' : ''}`}>
                    <td className="px-5 py-2.5 font-semibold text-industrial-900 text-xs">{localizeApiText(row.product, isUrdu)}</td>
                    <td className="px-5 py-2.5 text-right text-xs text-industrial-700">{row.quantity}</td>
                    <td className="px-5 py-2.5 text-right text-xs text-industrial-700">{fmtCurrency(row.cost)}</td>
                    <td className="px-5 py-2.5 text-right text-xs text-industrial-700">{fmtCurrency(row.gross_sales ?? row.sales)}</td>
                    <td className="px-5 py-2.5 text-right text-xs font-semibold text-yellow-600">{row.discount > 0 ? `- ${fmtCurrency(row.discount)}` : '—'}</td>
                    <td className="px-5 py-2.5 text-right text-xs text-accent-primary font-semibold">{fmtCurrency(row.sales)}</td>
                    <td className="px-5 py-2.5 text-right text-xs text-green-600 font-bold">{fmtCurrency(row.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stock Report Table */}
        <div className="rounded-xl border-2 border-industrial-200 bg-white overflow-hidden shrink-0">
          <div className="bg-industrial-800 px-5 py-3">
            <h2 className="text-sm font-bold text-white">{t.stockReport}</h2>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-industrial-700 text-white">
                <tr>
                  <th className="px-5 py-2.5 text-left text-xs font-bold uppercase tracking-wider">{t.product}</th>
                  <th className="px-5 py-2.5 text-right text-xs font-bold uppercase tracking-wider">{t.currentStock}</th>
                  <th className="px-5 py-2.5 text-right text-xs font-bold uppercase tracking-wider">{t.unit}</th>
                </tr>
              </thead>
              <tbody>
                {stockRows.map((row: any, idx: number) => (
                  <tr key={row.product_id} className={`border-t border-industrial-100 hover:bg-accent-primary/5 ${idx % 2 !== 0 ? 'bg-industrial-50/40' : ''}`}>
                    <td className="px-5 py-2.5 font-semibold text-industrial-900 text-xs">{localizeApiText(row.product_name, isUrdu)}</td>
                    <td className="px-5 py-2.5 text-right text-xs text-industrial-700 font-semibold">{row.current_stock}</td>
                    <td className="px-5 py-2.5 text-right text-xs text-industrial-700">{localizeApiUnit(row.unit, isUrdu)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Customers Table */}
        <div className="rounded-xl border-2 border-industrial-200 bg-white overflow-hidden shrink-0">
          <div className="bg-industrial-800 px-5 py-3">
            <h2 className="text-sm font-bold text-white">{t.topCustomers}</h2>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-industrial-700 text-white">
                <tr>
                  <th className="px-5 py-2.5 text-left text-xs font-bold uppercase tracking-wider">{t.customer}</th>
                  <th className="px-5 py-2.5 text-right text-xs font-bold uppercase tracking-wider">{t.purchaseVolume}</th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.map((row: any, idx: number) => (
                  <tr key={row.name} className={`border-t border-industrial-100 hover:bg-accent-primary/5 ${idx % 2 !== 0 ? 'bg-industrial-50/40' : ''}`}>
                    <td className="px-5 py-2.5 font-semibold text-industrial-900 text-xs">{localizeApiText(row.name, isUrdu)}</td>
                    <td className="px-5 py-2.5 text-right text-xs text-accent-primary font-bold">{fmtCurrency(row.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

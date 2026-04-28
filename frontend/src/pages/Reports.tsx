import { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, AlertCircle, Building2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Table } from '../components/ui/table';
import { api } from '../lib/api';
import { useLang } from '../lib/i18n';
import { localizeApiText, localizeApiUnit } from '../lib/localize';
import { fmtCurrency } from '../lib/utils';

export default function Reports() {
  const { t, isUrdu } = useLang();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [dashboard, setDashboard] = useState<any>(null);
  const [profitRows, setProfitRows] = useState<any[]>([]);
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
    setProfitRows(profitRes.data);
    setSalesRows(salesRes.data);
  };

  useEffect(() => {
    load();
  }, []);

  if (!dashboard) return <div className={isUrdu ? 'font-urdu' : ''}>{t.loadingReports}</div>;

  const totalSales = profitRows.reduce((sum, row) => sum + row.sales, 0);
  const totalProfit = profitRows.reduce((sum, row) => sum + row.profit, 0);
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
    <div className={`space-y-8 ${isUrdu ? 'font-urdu' : ''}`}>
      <Card className="p-6">
        <div className="grid gap-4 md:grid-cols-3 items-end">
          <div>
            <label className="mb-2 block text-sm font-semibold text-industrial-700">{t.fromDate}</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-industrial-700">{t.toDate}</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button onClick={() => load(from, to)} className="h-11">
            {t.applyFilter}
          </Button>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-4">
        <div className="industrial-card p-6 rounded-xl">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-sm" style={{ background: '#10b98120' }}>
              <TrendingUp className="h-6 w-6" style={{ color: '#10b981' }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-industrial-600">{t.totalSales}</p>
              <p className="mt-1 text-2xl font-bold text-industrial-900">{fmtCurrency(totalSales)}</p>
            </div>
          </div>
        </div>
        <div className="industrial-card p-6 rounded-xl">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-sm" style={{ background: '#16a34a20' }}>
              <DollarSign className="h-6 w-6" style={{ color: '#16a34a' }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-industrial-600">{t.totalProfit}</p>
              <p className="mt-1 text-2xl font-bold text-industrial-900">{fmtCurrency(totalProfit)}</p>
            </div>
          </div>
        </div>
        <div className="industrial-card p-6 rounded-xl">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-sm" style={{ background: '#ef444420' }}>
              <AlertCircle className="h-6 w-6" style={{ color: '#ef4444' }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-industrial-600">{t.customerReceivable}</p>
              <p className="mt-1 text-2xl font-bold text-industrial-900">{fmtCurrency(dashboard.customerPending)}</p>
            </div>
          </div>
        </div>
        <div className="industrial-card p-6 rounded-xl">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-sm" style={{ background: '#f59e0b20' }}>
              <Building2 className="h-6 w-6" style={{ color: '#f59e0b' }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-industrial-600">{t.millPayable}</p>
              <p className="mt-1 text-2xl font-bold text-industrial-900">{fmtCurrency(dashboard.millDues)}</p>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <div className="border-b border-industrial-200 px-6 py-5 bg-industrial-50">
          <h2 className="text-xl font-bold text-industrial-900">{t.productWiseSalesProfit}</h2>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-industrial-100 text-industrial-700">
              <tr>
                <th className="px-6 py-4 text-left font-bold">{t.product}</th>
                <th className="px-6 py-4 text-right font-bold">{t.quantity}</th>
                <th className="px-6 py-4 text-right font-bold">{t.purchasedPKR}</th>
                <th className="px-6 py-4 text-right font-bold">{t.soldPKR}</th>
                <th className="px-6 py-4 text-right font-bold">{t.profit}</th>
              </tr>
            </thead>
            <tbody>
              {profitRows.map((row, idx) => (
                <tr key={idx} className="border-t border-industrial-200 hover:bg-industrial-50">
                  <td className="px-6 py-4 font-semibold text-industrial-900">{localizeApiText(row.product, isUrdu)}</td>
                  <td className="px-6 py-4 text-right text-industrial-700">{row.quantity}</td>
                  <td className="px-6 py-4 text-right text-industrial-700">{fmtCurrency(row.cost)}</td>
                  <td className="px-6 py-4 text-right text-accent-primary font-semibold">{fmtCurrency(row.sales)}</td>
                  <td className="px-6 py-4 text-right text-green-600 font-bold">{fmtCurrency(row.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <div className="border-b border-industrial-200 px-6 py-5 bg-industrial-50">
          <h2 className="text-xl font-bold text-industrial-900">{t.stockReport}</h2>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-industrial-100 text-industrial-700">
              <tr>
                <th className="px-6 py-4 text-left font-bold">{t.product}</th>
                <th className="px-6 py-4 text-right font-bold">{t.currentStock}</th>
                <th className="px-6 py-4 text-right font-bold">{t.unit}</th>
              </tr>
            </thead>
            <tbody>
              {stockRows.map((row: any) => (
                <tr key={row.product_id} className="border-t border-industrial-200 hover:bg-industrial-50">
                  <td className="px-6 py-4 font-semibold text-industrial-900">{localizeApiText(row.product_name, isUrdu)}</td>
                  <td className="px-6 py-4 text-right text-industrial-700 font-semibold">{row.current_stock}</td>
                  <td className="px-6 py-4 text-right text-industrial-700">{localizeApiUnit(row.unit, isUrdu)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <div className="border-b border-industrial-200 px-6 py-5 bg-industrial-50">
          <h2 className="text-xl font-bold text-industrial-900">{t.topCustomers}</h2>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-industrial-100 text-industrial-700">
              <tr>
                <th className="px-6 py-4 text-left font-bold">{t.customer}</th>
                <th className="px-6 py-4 text-right font-bold">{t.purchaseVolume}</th>
              </tr>
            </thead>
            <tbody>
              {topCustomers.map((row: any) => (
                <tr key={row.name} className="border-t border-industrial-200 hover:bg-industrial-50">
                  <td className="px-6 py-4 font-semibold text-industrial-900">{localizeApiText(row.name, isUrdu)}</td>
                  <td className="px-6 py-4 text-right text-accent-primary font-bold">{fmtCurrency(row.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

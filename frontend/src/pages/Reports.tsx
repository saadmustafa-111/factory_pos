import { useEffect, useState } from 'react';
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
    <div className={`space-y-6 ${isUrdu ? 'font-urdu' : ''}`}>
      <Card className="grid gap-3 md:grid-cols-3">
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <button
          onClick={() => load(from, to)}
          className="h-10 rounded-lg bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-blue-700"
        >
          {t.applyFilter}
        </button>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>{t.totalSales}: {fmtCurrency(totalSales)}</Card>
        <Card>{t.totalProfit}: {fmtCurrency(totalProfit)}</Card>
        <Card>{t.customerReceivable}: {fmtCurrency(dashboard.customerPending)}</Card>
        <Card>{t.millPayable}: {fmtCurrency(dashboard.millDues)}</Card>
      </div>

      <Card>
        <h2 className="mb-2 font-semibold">{t.productWiseSalesProfit}</h2>
        <Table>
          <thead>
            <tr className="text-left text-slate-500">
              <th className="pb-2">{t.product}</th>
              <th>{t.quantity}</th>
              <th>{t.purchasedPKR}</th>
              <th>{t.soldPKR}</th>
              <th>{t.profit}</th>
            </tr>
          </thead>
          <tbody>
            {profitRows.map((row, idx) => (
              <tr key={idx} className="border-t border-slate-200">
                <td className="py-2">{localizeApiText(row.product, isUrdu)}</td>
                <td>{row.quantity}</td>
                <td>{fmtCurrency(row.cost)}</td>
                <td>{fmtCurrency(row.sales)}</td>
                <td>{fmtCurrency(row.profit)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold">{t.stockReport}</h2>
        <Table>
          <thead>
            <tr className="text-left text-slate-500">
              <th className="pb-2">{t.product}</th>
              <th>{t.currentStock}</th>
              <th>{t.unit}</th>
            </tr>
          </thead>
          <tbody>
            {stockRows.map((row: any) => (
              <tr key={row.product_id} className="border-t border-slate-200">
                <td className="py-2">{localizeApiText(row.product_name, isUrdu)}</td>
                <td>{row.current_stock}</td>
                <td>{localizeApiUnit(row.unit, isUrdu)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold">{t.topCustomers}</h2>
        <Table>
          <thead>
            <tr className="text-left text-slate-500">
              <th className="pb-2">{t.customer}</th>
              <th>{t.purchaseVolume}</th>
            </tr>
          </thead>
          <tbody>
            {topCustomers.map((row: any) => (
              <tr key={row.name} className="border-t border-slate-200">
                <td className="py-2">{localizeApiText(row.name, isUrdu)}</td>
                <td>{fmtCurrency(row.total)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}

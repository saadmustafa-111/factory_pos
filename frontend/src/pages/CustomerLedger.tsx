import { useEffect, useMemo, useState } from 'react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Modal } from '../components/ui/modal';
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

  const sc: any = { paid: 'bg-green-100 text-green-800 border border-green-200', partial: 'bg-accent-secondary/10 text-accent-secondary border border-accent-secondary/20', pending: 'bg-industrial-100 text-industrial-700 border border-industrial-300', overdue: 'bg-accent-danger/10 text-accent-danger border border-accent-danger/20' };
  const filterLabels: Record<Filter, string> = { all: t.allCustomers, 'has-balance': t.withBalance, overdue: t.overdueOnly };

  return (
    <div className={`space-y-8 ${isUrdu ? 'font-urdu' : ''}`}>
      <div className="flex gap-3 flex-wrap">
        {(['all', 'has-balance', 'overdue'] as Filter[]).map((f) => (
          <Button
            key={f}
            onClick={() => setFilter(f)}
            variant={filter === f ? 'default' : 'outline'}
            className="font-semibold"
          >
            {filterLabels[f]}
          </Button>
        ))}
      </div>

      {topBalances.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {topBalances.map((row: any) => (
            <Card key={row.customer_id} className="p-6">
              <h3 className="text-lg font-bold text-industrial-900 mb-4">{localizeApiText(row.customer_name, isUrdu)}</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-industrial-600">{t.totalOwed}</span>
                  <span className="text-sm font-bold text-industrial-900">{fmtCurrency(row.totalOwed)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-industrial-600">{t.totalPaid}</span>
                  <span className="text-sm font-bold text-green-600">{fmtCurrency(row.totalPaid)}</span>
                </div>
                <div className="flex justify-between items-center border-t-2 border-industrial-200 pt-3">
                  <span className="text-sm font-bold text-industrial-700">{t.balance}</span>
                  <span className="text-lg font-bold text-accent-danger">{fmtCurrency(row.balance)}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <div className="border-b border-industrial-200 px-6 py-5 bg-industrial-50">
          <h2 className="text-xl font-bold text-industrial-900">{t.customerLedgerTitle}</h2>
        </div>
        <div className="divide-y divide-industrial-200">
          {sales.length === 0 ? (
            <p className="px-6 py-8 text-center text-industrial-500 font-medium">{t.noData}</p>
          ) : sales.map((sale: any) => (
            <div key={sale.id} className="flex items-center justify-between px-6 py-4 gap-4 hover:bg-industrial-50 transition-colors">
              <div className="min-w-0 flex-1">
                <p className="font-bold text-industrial-900 text-lg">{localizeApiText(sale.customer?.name || sale.customer_name || '-', isUrdu)}</p>
                <p className="text-sm text-industrial-500 mt-1">
                  {new Date(sale.date).toLocaleDateString(locale)}
                  {sale.due_date ? ` • ${t.dueDate}: ${new Date(sale.due_date).toLocaleDateString(locale)}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="text-right">
                  <p className="text-sm font-semibold text-industrial-600">{t.balance}</p>
                  <p className={`text-lg font-bold ${sale.pending_amount > 0 ? 'text-accent-danger' : 'text-green-600'}`}>{fmtCurrency(sale.pending_amount)}</p>
                </div>
                <span className={`inline-block text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-full ${sc[sale.is_overdue ? 'overdue' : sale.status]}`}>
                  {sale.is_overdue ? t.overdue : sale.status === 'paid' ? t.paid : sale.status === 'partial' ? t.partial : t.pending}
                </span>
                {sale.pending_amount > 0 && (
                  <Button onClick={() => { setPaymentModal(sale); setAmount(String(sale.pending_amount)); }} size="sm">
                    {t.collectPayment}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {paymentModal && (
        <Modal open={!!paymentModal} title={t.collectPayment} onClose={() => setPaymentModal(null)}>
          <div className="space-y-4">
            <p className="text-sm text-industrial-600">
              {localizeApiText(paymentModal.customer?.name || paymentModal.customer_name, isUrdu)} • {t.balance}: <span className="font-bold text-accent-danger">{fmtCurrency(paymentModal.pending_amount)}</span>
            </p>
            <div>
              <label className="mb-2 block text-sm font-semibold text-industrial-700">{t.collectAmount}</label>
              <Input
                type="number"
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-lg font-bold"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button onClick={submitPayment} className="flex-1">
                {t.collect}
              </Button>
              <Button onClick={() => setPaymentModal(null)} variant="outline" className="flex-1">
                {t.cancel}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

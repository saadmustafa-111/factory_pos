import { useEffect, useState } from 'react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Modal } from '../components/ui/modal';
import { Table } from '../components/ui/table';
import { AttachmentManager } from '../components/AttachmentManager';
import { api } from '../lib/api';
import { useLang } from '../lib/i18n';
import { localizeApiText } from '../lib/localize';
import { fmtCurrency } from '../lib/utils';

type Tab = 'all' | 'paid' | 'partial' | 'pending';

export default function Payments() {
  const { t, isUrdu } = useLang();
  const locale = isUrdu ? 'ur-PK' : 'en-PK';
  const [tab, setTab] = useState<Tab>('all');
  const [sales, setSales] = useState<any[]>([]);
  const [modalSale, setModalSale] = useState<any>(null);
  const [amount, setAmount] = useState<number>(0);

  const load = async () => {
    const { data } = await api.get('/sales', { params: { status: tab } });
    setSales(data);
  };

  useEffect(() => {
    load();
  }, [tab]);

  const submitPayment = async () => {
    await api.post('/payments', {
      sale_id: modalSale.id,
      amount_paid: Number(amount),
      payment_date: new Date().toISOString(),
    });
    setModalSale(null);
    setAmount(0);
    await load();
  };

  return (
    <div className={`space-y-4 ${isUrdu ? 'font-urdu' : ''}`}>
      {/* Tab bar */}
      <div className="flex gap-2 bg-white border-2 border-industrial-200 rounded-xl p-2 shadow-industrial">
        {(['all', 'paid', 'partial', 'pending'] as Tab[]).map((tabItem) => (
          <button
            key={tabItem}
            onClick={() => setTab(tabItem)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 ${
              tab === tabItem
                ? 'bg-accent-primary text-white shadow-industrial'
                : 'text-industrial-600 hover:bg-industrial-100'
            }`}
          >
            {tabItem === 'all' ? t.allCustomers : tabItem === 'paid' ? t.paid : tabItem === 'partial' ? t.partial : t.pending}
          </button>
        ))}
      </div>

      <div className="industrial-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-industrial-100 text-industrial-700 text-left">
                <th className="px-6 py-4 font-bold">{t.date}</th>
                <th className="px-6 py-4 font-bold">{t.customer}</th>
                <th className="px-6 py-4 text-right font-bold">{t.total}</th>
                <th className="px-6 py-4 text-right font-bold">{t.paid}</th>
                <th className="px-6 py-4 text-right font-bold">{t.pending}</th>
                <th className="px-6 py-4 font-bold">{t.status}</th>
                <th className="px-6 py-4 font-bold">{t.edit}</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id} className="border-t border-industrial-200 hover:bg-industrial-50 transition-colors">
                  <td className="px-6 py-4 text-industrial-700 font-medium">{new Date(sale.date).toLocaleDateString(locale)}</td>
                  <td className="px-6 py-4 font-semibold text-industrial-900">{localizeApiText(sale.customer_name || '-', isUrdu)}</td>
                  <td className="px-6 py-4 text-right font-semibold text-industrial-900">{fmtCurrency(sale.total_amount)}</td>
                  <td className="px-6 py-4 text-right text-green-600 font-semibold">{fmtCurrency(sale.paid_amount)}</td>
                  <td className="px-6 py-4 text-right text-accent-danger font-semibold">{fmtCurrency(sale.pending_amount)}</td>
                  <td className="px-6 py-4">
                    <Badge value={sale.status} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {(sale.status === 'partial' || sale.status === 'pending') && (
                        <Button onClick={() => setModalSale(sale)} size="sm">{t.addPayment}</Button>
                      )}
                      <AttachmentManager
                        entityType="sale"
                        entityId={sale.id}
                        label={`Sale #${sale.id}`}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-industrial-500 font-medium">No records found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!modalSale} title={t.recordPayment} onClose={() => setModalSale(null)}>
        <div className="space-y-3">
          <Input
            type="number"
            step="0.01"
            value={amount || ''}
            onChange={(e) => setAmount(Number(e.target.value))}
            placeholder={t.amount}
          />
          <Button onClick={submitPayment}>{t.submit}</Button>
        </div>
      </Modal>
    </div>
  );
}

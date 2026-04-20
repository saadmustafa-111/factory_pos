import { useEffect, useState } from 'react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Modal } from '../components/ui/modal';
import { Table } from '../components/ui/table';
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
      <Card className="flex gap-2">
        {(['all', 'paid', 'partial', 'pending'] as Tab[]).map((tabItem) => (
          <Button key={tabItem} variant={tab === tabItem ? 'default' : 'secondary'} onClick={() => setTab(tabItem)}>
            {tabItem === 'all' ? t.allCustomers : tabItem === 'paid' ? t.paid : tabItem === 'partial' ? t.partial : t.pending}
          </Button>
        ))}
      </Card>
      <Card>
        <Table>
          <thead>
            <tr className="text-left text-slate-400">
              <th className="pb-2">{t.date}</th>
              <th>{t.customer}</th>
              <th>{t.total}</th>
              <th>{t.paid}</th>
              <th>{t.pending}</th>
              <th>{t.status}</th>
              <th>{t.edit}</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => (
              <tr key={sale.id} className="border-t border-slate-800">
                <td className="py-2">{new Date(sale.date).toLocaleDateString(locale)}</td>
                <td>{localizeApiText(sale.customer_name || '-', isUrdu)}</td>
                <td>{fmtCurrency(sale.total_amount)}</td>
                <td>{fmtCurrency(sale.paid_amount)}</td>
                <td>{fmtCurrency(sale.pending_amount)}</td>
                <td>
                  <Badge value={sale.status} />
                </td>
                <td>
                  {(sale.status === 'partial' || sale.status === 'pending') && (
                    <Button onClick={() => setModalSale(sale)}>{t.addPayment}</Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

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

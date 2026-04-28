import { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Modal } from '../components/ui/modal';
import { AttachmentManager } from '../components/AttachmentManager';
import { api } from '../lib/api';
import { useLang } from '../lib/i18n';
import { localizeApiText } from '../lib/localize';
import { fmtCurrency } from '../lib/utils';

type Filter = 'all' | 'has-balance';

export default function MillLedger() {
  const { t, isUrdu } = useLang();
  const locale = isUrdu ? 'ur-PK' : 'en-PK';
  const [filter, setFilter] = useState<Filter>('all');
  const [rows, setRows] = useState<any[]>([]);
  const [paymentModal, setPaymentModal] = useState<any>(null);
  const [amount, setAmount] = useState('');

  const load = async () => {
    const { data } = await api.get('/mill-payments/ledger');
    setRows(filter === 'has-balance' ? data.filter((r: any) => r.balance > 0) : data);
  };
  useEffect(() => { load(); }, [filter]);

  const submitPayment = async () => {
    if (!paymentModal || !amount) return;
    await api.post('/mill-payments', {
      supplier_id: paymentModal.supplier_id,
      inventory_id: paymentModal.id,
      amount_paid: Number(amount),
      payment_date: new Date().toISOString(),
    });
    setPaymentModal(null); setAmount(''); await load();
  };

  const sc: any = { paid: 'bg-green-100 text-green-800 border border-green-200', partial: 'bg-accent-secondary/10 text-accent-secondary border border-accent-secondary/20', pending: 'bg-industrial-100 text-industrial-700 border border-industrial-300' };

  return (
    <div className={`space-y-8 ${isUrdu ? 'font-urdu' : ''}`}>
      <div className="flex gap-3">
        {(['all', 'has-balance'] as Filter[]).map((f) => (
          <Button
            key={f}
            onClick={() => setFilter(f)}
            variant={filter === f ? 'default' : 'outline'}
            className="font-semibold"
          >
            {f === 'all' ? t.allSuppliers : t.hasBalance}
          </Button>
        ))}
      </div>

      {rows.map((row) => (
        <Card key={row.supplier.id}>
          <div className="flex flex-wrap items-center justify-between border-b border-industrial-200 px-6 py-5 bg-industrial-50">
            <div>
              <h3 className="text-xl font-bold text-industrial-900">{localizeApiText(row.supplier.name, isUrdu)}</h3>
              {row.supplier.phone && <p className="text-sm text-industrial-500 mt-1">{row.supplier.phone}</p>}
            </div>
            <div className="flex gap-8 text-sm">
              <div className="text-center">
                <p className="text-sm font-semibold text-industrial-600">{t.totalPurchased}</p>
                <p className="text-lg font-bold text-industrial-900">{fmtCurrency(row.totalPurchased)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-industrial-600">{t.amountPaidLabel}</p>
                <p className="text-lg font-bold text-green-600">{fmtCurrency(row.totalPaid)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-industrial-600">{t.amountDue}</p>
                <p className={`text-xl font-bold ${row.balance > 0 ? 'text-accent-danger' : 'text-green-600'}`}>{fmtCurrency(row.balance)}</p>
              </div>
            </div>
          </div>
          {row.inventoryRecords.length === 0 ? (
            <p className="px-6 py-8 text-center text-industrial-500 font-medium">{t.noData}</p>
          ) : (
            <div className="divide-y divide-industrial-200">
              {row.inventoryRecords.map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between px-6 py-4 gap-4 hover:bg-industrial-50 transition-colors">
                  <div>
                    <p className="font-bold text-industrial-900 text-lg">{localizeApiText(inv.product?.name, isUrdu)}</p>
                    <p className="text-sm text-industrial-500 mt-1">{new Date(inv.date).toLocaleDateString(locale)}</p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-industrial-600">{t.amountDue}</p>
                      <p className={`text-lg font-bold ${inv.amount_pending_to_mill > 0 ? 'text-accent-danger' : 'text-green-600'}`}>{fmtCurrency(inv.amount_pending_to_mill)}</p>
                    </div>
                    <span className={`inline-block text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-full ${sc[inv.payment_status]}`}>
                      {inv.payment_status === 'paid' ? t.paid : inv.payment_status === 'partial' ? t.partial : t.pending}
                    </span>
                    {inv.amount_pending_to_mill > 0 && (
                      <Button onClick={() => { setPaymentModal({ ...inv, supplier_id: row.supplier.id }); setAmount(String(inv.amount_pending_to_mill)); }} size="sm">
                        {t.payMill}
                      </Button>
                    )}
                    <AttachmentManager
                      entityType="inventory"
                      entityId={inv.id}
                      label={`${row.supplier.name} — ${inv.product?.name ?? ''}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      ))}

      {paymentModal && (
        <Modal open={!!paymentModal} title={t.payMill} onClose={() => setPaymentModal(null)}>
          <div className="space-y-4">
            <p className="text-sm text-industrial-600">
              {localizeApiText(paymentModal.product?.name, isUrdu)} • {t.amountDue}: <span className="font-bold text-accent-danger">{fmtCurrency(paymentModal.amount_pending_to_mill)}</span>
            </p>
            <div>
              <label className="mb-2 block text-sm font-semibold text-industrial-700">{t.payAmount}</label>
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
                {t.pay}
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

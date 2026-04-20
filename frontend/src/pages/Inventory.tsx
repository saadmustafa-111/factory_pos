import { useEffect, useMemo, useState } from 'react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Table } from '../components/ui/table';
import { api } from '../lib/api';
import { useLang } from '../lib/i18n';
import { localizeApiText, localizeApiUnit } from '../lib/localize';
import { Product } from '../lib/types';
import { fmtCurrency } from '../lib/utils';

export default function Inventory() {
  const { t, isUrdu } = useLang();
  const locale = isUrdu ? 'ur-PK' : 'en-PK';
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [stock, setStock] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [form, setForm] = useState({
    supplier_id: 0,
    product_id: 0,
    cement_brand_id: 0,
    date: new Date().toISOString().slice(0, 10),
    quantity_received: 0,
    purchase_price_per_unit: 0,
    amount_paid_to_mill: 0,
    notes: '',
  });

  const selectedProduct = products.find((p) => p.id === Number(form.product_id));
  const totalCost = useMemo(
    () => Number(form.quantity_received || 0) * Number(form.purchase_price_per_unit || 0),
    [form.quantity_received, form.purchase_price_per_unit],
  );
  const pendingToMill = useMemo(
    () => Math.max(0, totalCost - Number(form.amount_paid_to_mill || 0)),
    [totalCost, form.amount_paid_to_mill],
  );
  const paymentStatus = pendingToMill === 0 ? 'paid' : form.amount_paid_to_mill > 0 ? 'partial' : 'pending';

  const load = async () => {
    const [productsRes, brandsRes, suppliersRes, stockRes, historyRes] = await Promise.all([
      api.get('/products'),
      api.get('/cement-brands'),
      api.get('/suppliers'),
      api.get('/inventory/stock'),
      api.get('/inventory/history'),
    ]);
    setProducts(productsRes.data);
    setBrands(brandsRes.data);
    setSuppliers(suppliersRes.data);
    setStock(stockRes.data);
    setHistory(historyRes.data);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/inventory', {
      supplier_id: Number(form.supplier_id),
      product_id: Number(form.product_id),
      cement_brand_id: form.cement_brand_id || undefined,
      quantity_received: Number(form.quantity_received),
      purchase_price_per_unit: Number(form.purchase_price_per_unit),
      amount_paid_to_mill: Number(form.amount_paid_to_mill || 0),
      date: form.date,
      notes: form.notes,
    });
    setForm({
      ...form,
      quantity_received: 0,
      purchase_price_per_unit: 0,
      amount_paid_to_mill: 0,
      notes: '',
    });
    await load();
  };

  return (
    <div className={`space-y-6 ${isUrdu ? 'font-urdu' : ''}`}>
      <Card>
        <h2 className="mb-3 font-semibold">{t.addStock}</h2>
        <form className="grid gap-3 md:grid-cols-3" onSubmit={submit}>
          <select
            value={form.supplier_id}
            onChange={(e) => setForm({ ...form, supplier_id: Number(e.target.value) })}
            className="h-10 rounded-md border border-slate-300 bg-white px-3"
            required
          >
            <option value={0}>{t.selectSupplier}</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {localizeApiText(supplier.name, isUrdu)}
              </option>
            ))}
          </select>
          <select
            value={form.product_id}
            onChange={(e) => setForm({ ...form, product_id: Number(e.target.value) })}
            className="h-10 rounded-md border border-slate-300 bg-white px-3"
            required
          >
            <option value={0}>{t.selectProduct}</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {localizeApiText(p.name, isUrdu)}
              </option>
            ))}
          </select>
          <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          {selectedProduct?.category === 'cement' && (
            <select
              value={form.cement_brand_id}
              onChange={(e) => setForm({ ...form, cement_brand_id: Number(e.target.value) })}
              className="h-10 rounded-md border border-slate-300 bg-white px-3"
              required
            >
              <option value={0}>{t.selectBrand}</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {localizeApiText(b.brand_name, isUrdu)}
                </option>
              ))}
            </select>
          )}
          <Input
            type="number"
            step="0.01"
            placeholder={t.quantityWeight}
            value={form.quantity_received || ''}
            onChange={(e) => setForm({ ...form, quantity_received: Number(e.target.value) })}
            required
          />
          <Input
            type="number"
            step="0.01"
            placeholder={t.amountPaidNow}
            value={form.amount_paid_to_mill || ''}
            onChange={(e) => setForm({ ...form, amount_paid_to_mill: Number(e.target.value) })}
          />
          <Input
            type="number"
            step="0.01"
            placeholder={t.purchasePrice}
            value={form.purchase_price_per_unit || ''}
            onChange={(e) => setForm({ ...form, purchase_price_per_unit: Number(e.target.value) })}
            required
          />
          <Input
            placeholder={t.notes}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <div className="self-center text-sm text-slate-700">{t.totalCost}: {fmtCurrency(totalCost)}</div>
          <div className="self-center text-sm text-slate-700">{t.amountPending}: {fmtCurrency(pendingToMill)}</div>
          <div className="self-center text-sm">
            {t.status}: <Badge value={paymentStatus} />
          </div>
          <Button type="submit">{t.addStock}</Button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">{t.currentStockLevel}</h2>
        <Table>
          <thead>
            <tr className="text-left text-slate-500">
              <th className="pb-2">{t.product}</th>
              <th>{t.typeBrand}</th>
              <th>{t.stock}</th>
              <th>{t.unit}</th>
              <th>{t.lastUpdated}</th>
            </tr>
          </thead>
          <tbody>
            {stock.map((row) => (
              <tr key={row.product_id} className="border-t border-slate-200">
                <td className="py-2">{localizeApiText(row.product?.name, isUrdu)}</td>
                <td>{localizeApiText(row.cement_brand?.brand_name || row.product?.type, isUrdu)}</td>
                <td>{row.stock}</td>
                <td>{localizeApiUnit(row.product?.unit, isUrdu)}</td>
                <td>{row.last_updated ? new Date(row.last_updated).toLocaleString(locale) : '-'}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">{t.stockHistory}</h2>
        <Table>
          <thead>
            <tr className="text-left text-slate-500">
              <th className="pb-2">{t.date}</th>
              <th>{t.supplier}</th>
              <th>{t.product}</th>
              <th>{t.totalCost}</th>
              <th>{t.paid}</th>
              <th>{t.pending}</th>
              <th>{t.status}</th>
            </tr>
          </thead>
          <tbody>
            {history.map((row) => (
              <tr key={row.id} className="border-t border-slate-200">
                <td className="py-2">{new Date(row.date).toLocaleDateString(locale)}</td>
                <td>{localizeApiText(row.supplier?.name, isUrdu)}</td>
                <td>{localizeApiText(row.product?.name, isUrdu)}</td>
                <td>{fmtCurrency(row.total_cost)}</td>
                <td>{fmtCurrency(row.amount_paid_to_mill)}</td>
                <td>{fmtCurrency(row.amount_pending_to_mill)}</td>
                <td>
                  <Badge value={row.payment_status} />
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}

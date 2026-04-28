import { useEffect, useMemo, useState } from 'react';
import { Trash2, Plus, Package, Truck, Calendar, DollarSign, FileText, AlertCircle } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Modal } from '../components/ui/modal';
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
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
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

  const deleteInventory = async (id: number) => {
    setItemToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (itemToDelete === null) return;
    try {
      await api.delete(`/inventory/${itemToDelete}`);
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
      await load();
    } catch (error) {
      console.error('Error deleting inventory:', error);
      alert('Failed to delete inventory entry');
    }
  };

  return (
    <div className={`space-y-8 ${isUrdu ? 'font-urdu' : ''}`}>
      {/* Add Stock Form */}
      <Card className="p-0 overflow-hidden">
        <div className="flex items-center gap-3 border-b border-industrial-200 bg-industrial-50 px-6 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-primary/15">
            <Plus className="h-5 w-5 text-accent-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-industrial-900">{t.addStock}</h2>
            <p className="text-xs text-industrial-500 mt-0.5">{isUrdu ? 'نئی اسٹاک انٹری شامل کریں' : 'Record incoming stock from suppliers'}</p>
          </div>
        </div>

        <form className="p-6 space-y-6" onSubmit={submit}>
          {/* Basic Information Section */}
          <div className="rounded-xl border-2 border-industrial-200 bg-white overflow-hidden">
            <div className="flex items-center gap-2 border-b border-industrial-100 bg-industrial-50 px-5 py-3">
              <Package className="h-4 w-4 text-industrial-600" />
              <h3 className="text-sm font-bold uppercase tracking-wide text-industrial-600">{t.basicInfo}</h3>
            </div>
            <div className="p-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-industrial-700">{t.supplier}</label>
                <select
                  value={form.supplier_id}
                  onChange={(e) => setForm({ ...form, supplier_id: Number(e.target.value) })}
                  className="h-11 w-full rounded-lg border-2 border-industrial-300 bg-white px-4 text-sm font-medium outline-none transition-all duration-200 focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20"
                  required
                >
                  <option value={0}>{t.selectSupplier}</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {localizeApiText(supplier.name, isUrdu)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-industrial-700">{t.product}</label>
                <select
                  value={form.product_id}
                  onChange={(e) => setForm({ ...form, product_id: Number(e.target.value) })}
                  className="h-11 w-full rounded-lg border-2 border-industrial-300 bg-white px-4 text-sm font-medium outline-none transition-all duration-200 focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20"
                  required
                >
                  <option value={0}>{t.selectProduct}</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {localizeApiText(p.name, isUrdu)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-industrial-700">{t.date}</label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </div>

              {selectedProduct?.category === 'cement' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-industrial-700">{t.brand}</label>
                  <select
                    value={form.cement_brand_id}
                    onChange={(e) => setForm({ ...form, cement_brand_id: Number(e.target.value) })}
                    className="h-11 w-full rounded-lg border-2 border-industrial-300 bg-white px-4 text-sm font-medium outline-none transition-all duration-200 focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20"
                    required
                  >
                    <option value={0}>{t.selectBrand}</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {localizeApiText(b.brand_name, isUrdu)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Quantity & Pricing Section */}
          <div className="rounded-xl border-2 border-industrial-200 bg-white overflow-hidden">
            <div className="flex items-center gap-2 border-b border-industrial-100 bg-industrial-50 px-5 py-3">
              <Truck className="h-4 w-4 text-industrial-600" />
              <h3 className="text-sm font-bold uppercase tracking-wide text-industrial-600">{t.quantityAndPricing}</h3>
            </div>
            <div className="p-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-industrial-700">{t.quantityWeight}</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={form.quantity_received || ''}
                  onChange={(e) => setForm({ ...form, quantity_received: Number(e.target.value) })}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-industrial-700">{t.purchasePrice}</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={form.purchase_price_per_unit || ''}
                  onChange={(e) => setForm({ ...form, purchase_price_per_unit: Number(e.target.value) })}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-industrial-700">{t.amountPaidNow}</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount_paid_to_mill || ''}
                  onChange={(e) => setForm({ ...form, amount_paid_to_mill: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>

          {/* Summary Section */}
          <div className="rounded-xl border-2 border-accent-primary/25 bg-white overflow-hidden">
            <div className="flex items-center gap-2 border-b border-accent-primary/20 bg-accent-primary/5 px-5 py-3">
              <DollarSign className="h-4 w-4 text-accent-primary" />
              <h3 className="text-sm font-bold uppercase tracking-wide text-accent-primary">{t.summary}</h3>
            </div>
            <div className="p-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border-2 border-industrial-100 bg-industrial-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-industrial-500 mb-1">{t.totalCost}</p>
                <p className="text-2xl font-bold text-industrial-900">{fmtCurrency(totalCost)}</p>
              </div>
              <div className="rounded-xl border-2 border-accent-primary/20 bg-accent-primary/5 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-accent-primary mb-1">{t.amountPaid}</p>
                <p className="text-2xl font-bold text-accent-primary">{fmtCurrency(form.amount_paid_to_mill || 0)}</p>
              </div>
              <div className="rounded-xl border-2 border-accent-danger/20 bg-accent-danger/5 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-accent-danger mb-1">{t.amountPending}</p>
                <p className="text-2xl font-bold text-accent-danger">{fmtCurrency(pendingToMill)}</p>
              </div>
              <div className="rounded-xl border-2 border-industrial-100 bg-industrial-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-industrial-500 mb-1">{t.status}</p>
                <div className="mt-1">
                  <Badge value={paymentStatus} />
                </div>
              </div>
            </div>
          </div>

          {/* Notes Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-industrial-700">{t.notes}</label>
            <Input
              placeholder={t.notes}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4">
            <Button type="submit" size="lg" className="px-8">
              <Plus className="mr-2 h-5 w-5" />
              {t.addStock}
            </Button>
          </div>
        </form>
      </Card>

      {/* Current Stock Level */}
      <Card className="p-0 overflow-hidden">
        <div className="flex items-center gap-3 border-b border-industrial-200 bg-industrial-50 px-6 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-secondary/15">
            <Package className="h-5 w-5 text-accent-secondary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-industrial-900">{t.currentStockLevel}</h2>
            <p className="text-xs text-industrial-500 mt-0.5">{isUrdu ? 'موجودہ اسٹاک کی تفصیل' : 'Live stock quantities by product'}</p>
          </div>
        </div>

        {stock.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="h-16 w-16 text-industrial-400 mb-4" />
            <h3 className="text-lg font-semibold text-industrial-600 mb-2">{t.noStockData}</h3>
            <p className="text-industrial-500">{t.addStockFirst}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-industrial-100 text-industrial-700">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold">{t.product}</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">{t.typeBrand}</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">{t.stock}</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">{t.unit}</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">{t.lastUpdated}</th>
                </tr>
              </thead>
              <tbody>
                {stock.map((row, index) => (
                  <tr key={row.product_id} className={`border-b border-industrial-100 hover:bg-accent-primary/5 transition-colors ${index % 2 !== 0 ? 'bg-industrial-50/40' : 'bg-white'}`}>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-primary/10">
                          <Package className="h-4 w-4 text-accent-primary" />
                        </div>
                        <span className="font-semibold text-industrial-900">{localizeApiText(row.product?.name, isUrdu)}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-industrial-600">{localizeApiText(row.cement_brand?.brand_name || row.product?.type, isUrdu)}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center rounded-full bg-accent-primary/10 px-3 py-1 text-base font-bold text-accent-primary">{row.stock}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-industrial-600">{localizeApiUnit(row.product?.unit, isUrdu)}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-industrial-500">
                        {row.last_updated ? new Date(row.last_updated).toLocaleString(locale) : '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Stock History */}
      <Card className="p-0 overflow-hidden">
        <div className="flex items-center gap-3 border-b border-industrial-200 bg-industrial-50 px-6 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-primary/10">
            <Calendar className="h-5 w-5 text-accent-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-industrial-900">{t.stockHistory}</h2>
            <p className="text-xs text-industrial-500 mt-0.5">{isUrdu ? 'تمام اسٹاک انٹریز کی تاریخ' : 'All past stock receipts and payments'}</p>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="h-16 w-16 text-industrial-400 mb-4" />
            <h3 className="text-lg font-semibold text-industrial-600 mb-2">{t.noHistoryData}</h3>
            <p className="text-industrial-500">{t.historyWillAppear}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-industrial-100 text-industrial-700">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold">{t.date}</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">{t.supplier}</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">{t.product}</th>
                  <th className="px-6 py-4 text-right text-sm font-bold">{t.totalCost}</th>
                  <th className="px-6 py-4 text-right text-sm font-bold">{t.paid}</th>
                  <th className="px-6 py-4 text-right text-sm font-bold">{t.pending}</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">{t.status}</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row, index) => (
                  <tr key={row.id} className={`border-b border-industrial-100 hover:bg-accent-primary/5 transition-colors ${index % 2 !== 0 ? 'bg-industrial-50/40' : 'bg-white'}`}>
                    <td className="py-4 px-6">
                      <div>
                        <div className="font-semibold text-industrial-900">{new Date(row.date).toLocaleDateString(locale)}</div>
                        <div className="text-xs text-industrial-500 mt-0.5">{new Date(row.date).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-industrial-100">
                          <Truck className="h-3.5 w-3.5 text-industrial-600" />
                        </div>
                        <span className="font-medium text-industrial-900">{localizeApiText(row.supplier?.name, isUrdu)}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-medium text-industrial-900">{localizeApiText(row.product?.name, isUrdu)}</span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="font-bold text-industrial-900">{fmtCurrency(row.total_cost)}</span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="font-semibold text-accent-primary">{fmtCurrency(row.amount_paid_to_mill)}</span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="font-semibold text-accent-danger">{fmtCurrency(row.amount_pending_to_mill)}</span>
                    </td>
                    <td className="py-4 px-6">
                      <Badge value={row.payment_status} />
                    </td>
                    <td className="py-4 px-6">
                      <button
                        onClick={() => deleteInventory(row.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                        title={t.delete}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={isDeleteModalOpen}
        title={t.confirmDelete}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setItemToDelete(null);
        }}
      >
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-industrial-900 mb-2">{t.confirmDelete}</h3>
              <p className="text-industrial-600">{t.confirmDeleteMessage}</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-industrial-200">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setItemToDelete(null);
              }}
            >
              {t.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t.delete}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

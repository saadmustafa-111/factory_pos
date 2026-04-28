import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, AlertCircle, User, Search, X, Printer } from 'lucide-react';
import { AttachmentManager } from '../components/AttachmentManager';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { api } from '../lib/api';
import { useLang } from '../lib/i18n';
import { localizeApiText } from '../lib/localize';
import { Product } from '../lib/types';
import { fmtCurrency } from '../lib/utils';
import { printReceipt, ReceiptData } from '../lib/printReceipt';

type DraftItem = {
  product_id: number;
  cement_brand_id?: number;
  quantity: number;
  sale_price_per_unit: number;
  total: number;
};

const sel = "h-11 w-full rounded-lg border-2 border-industrial-300 bg-white px-4 text-sm font-medium focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 focus:outline-none appearance-none cursor-pointer";
const inp = "h-11 w-full rounded-lg border-2 border-industrial-300 bg-white px-4 text-sm font-medium focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 focus:outline-none";

export default function Sales() {
  const { t, isUrdu } = useLang();
  const locale = isUrdu ? 'ur-PK' : 'en-PK';
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [allSales, setAllSales] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [draft, setDraft] = useState<DraftItem>({ product_id: 0, quantity: 0, sale_price_per_unit: 0, total: 0 });
  const [sale, setSale] = useState({
    date: new Date().toISOString().slice(0, 10),
    isCredit: false, credit_days: 0, due_date: '', amount_paid: 0, notes: '',
  });
  // Customer state
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number>(0);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerAddress, setNewCustomerAddress] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const filteredCustomers = customers.filter(c =>
    c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone?.includes(customerSearch)
  );
  const [items, setItems] = useState<DraftItem[]>([]);
  const [savedMsg, setSavedMsg] = useState('');
  const [lastSaleReceipt, setLastSaleReceipt] = useState<ReceiptData | null>(null);
  const [validationError, setValidationError] = useState('');

  const load = async () => {
    const [p, b, s, c] = await Promise.all([
      api.get('/products'), api.get('/cement-brands'), api.get('/sales'), api.get('/customers'),
    ]);
    setProducts(p.data); setBrands(b.data); setAllSales(s.data); setCustomers(c.data?.data ?? c.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const selected = products.find((p) => p.id === Number(draft.product_id));
  const isWeightBased = selected && ['kg', 'maund', 'ton'].includes(selected.unit);
  const addItem = () => {
    if (!draft.product_id || !draft.quantity || !draft.sale_price_per_unit) return;
    const total = Number(draft.quantity) * Number(draft.sale_price_per_unit);
    setItems([...items, { ...draft, total }]);
    setDraft({ product_id: 0, quantity: 0, sale_price_per_unit: 0, total: 0 });
  };

  const grandTotal = useMemo(() => items.reduce((s, i) => s + i.total, 0), [items]);
  const pending = Math.max(0, grandTotal - Number(sale.amount_paid || 0));
  const status = pending === 0 ? 'paid' : sale.amount_paid > 0 ? 'partial' : 'pending';

  const submitSale = async () => {
    setValidationError('');
    if (!items.length) { setValidationError('Please add at least one item.'); return; }
    if (sale.isCredit && !sale.credit_days) { setValidationError('Credit sale requires Credit Days to be set (e.g. 30 days).'); return; }
    if (customerMode === 'existing' && !selectedCustomerId) { setValidationError('Please select a customer.'); return; }
    if (customerMode === 'new' && !newCustomerName.trim()) { setValidationError('Please enter the customer name.'); return; }

    const customerPayload = customerMode === 'existing' && selectedCustomerId
      ? { customer_id: selectedCustomerId }
      : { customer_name: newCustomerName.trim(), customer_phone: newCustomerPhone.trim() || undefined, customer_address: newCustomerAddress.trim() || undefined };

    const resp = await api.post('/sales', {
      date: sale.date,
      due_date: sale.isCredit ? sale.due_date || undefined : undefined,
      credit_days: sale.isCredit ? Number(sale.credit_days || 0) : undefined,
      paid_amount: Number(sale.amount_paid || 0),
      notes: sale.notes,
      ...customerPayload,
      items: items.map((i) => ({
        product_id: i.product_id, cement_brand_id: i.cement_brand_id,
        quantity: Number(i.quantity), sale_price_per_unit: Number(i.sale_price_per_unit),
      })),
    });

    // Build receipt data for printing
    const savedSale = resp.data;
    const customerName = customerMode === 'existing'
      ? customers.find(c => c.id === selectedCustomerId)?.name || 'Customer'
      : newCustomerName;
    const customerPhone = customerMode === 'existing'
      ? customers.find(c => c.id === selectedCustomerId)?.phone
      : newCustomerPhone;
    const customerAddress = customerMode === 'existing'
      ? customers.find(c => c.id === selectedCustomerId)?.address
      : newCustomerAddress;

    const receiptData: ReceiptData = {
      saleId: savedSale.id,
      date: sale.date,
      customerName,
      customerPhone: customerPhone || undefined,
      customerAddress: customerAddress || undefined,
      items: items.map((i) => {
        const p = products.find(x => x.id === i.product_id);
        const b = i.cement_brand_id ? brands.find(x => x.id === i.cement_brand_id) : undefined;
        return {
          name: p?.name || 'Item',
          brand: b?.brand_name,
          quantity: Number(i.quantity),
          unit: p?.unit || '',
          rate: Number(i.sale_price_per_unit),
          total: Number(i.total),
        };
      }),
      totalAmount: Number(sale.amount_paid || 0) + items.reduce((s, i) => s + Number(i.total), 0) - Number(sale.amount_paid || 0),
      paidAmount: Number(sale.amount_paid || 0),
      pendingAmount: Math.max(0, items.reduce((s, i) => s + Number(i.total), 0) - Number(sale.amount_paid || 0)),
      paymentType: sale.isCredit ? 'credit' : 'cash',
      notes: sale.notes,
    };
    // Fix totalAmount
    receiptData.totalAmount = items.reduce((s, i) => s + Number(i.total), 0);
    setLastSaleReceipt(receiptData);
    setItems([]);
    setSale({ date: new Date().toISOString().slice(0, 10), isCredit: false, credit_days: 0, due_date: '', amount_paid: 0, notes: '' });
    setCustomerMode('existing'); setSelectedCustomerId(0); setNewCustomerName(''); setNewCustomerPhone(''); setNewCustomerAddress(''); setCustomerSearch('');
    setSavedMsg(t.completeSale + ' ✓');
    setTimeout(() => { setSavedMsg(''); setLastSaleReceipt(null); }, 30000);
    await load();
  };

  const printExistingSale = async (saleId: number) => {
    try {
      const res = await api.get(`/sales/${saleId}`);
      const s = res.data;
      const receipt: ReceiptData = {
        saleId: s.id,
        date: s.date,
        customerName: s.customer?.name || s.customer_name || 'Customer',
        customerPhone: s.customer?.phone || s.customer_phone,
        customerAddress: s.customer?.address,
        items: (s.items || []).map((item: any) => ({
          name: item.product?.name || 'Item',
          brand: item.cement_brand?.brand_name,
          quantity: Number(item.quantity),
          unit: item.product?.unit || '',
          rate: Number(item.sale_price_per_unit),
          total: Number(item.total_price),
        })),
        totalAmount: Number(s.total_amount),
        paidAmount: Number(s.paid_amount),
        pendingAmount: Number(s.pending_amount),
        paymentType: Number(s.pending_amount) > 0 ? 'credit' : 'cash',
        notes: s.notes,
      };
      printReceipt(receipt);
    } catch (err) {
      console.error('Failed to print receipt:', err);
    }
  };

  const sc: any = { paid: 'bg-green-100 text-green-800 border border-green-200', partial: 'bg-accent-secondary/10 text-accent-secondary border border-accent-secondary/20', pending: 'bg-industrial-100 text-industrial-700 border border-industrial-300', overdue: 'bg-accent-danger/10 text-accent-danger border border-accent-danger/20' };

  return (
    <div className={`space-y-8 ${isUrdu ? 'font-urdu' : ''}`}>
      <Card>
        <div className="border-b border-industrial-200 px-6 py-5 bg-industrial-50">
          <h2 className="text-xl font-bold text-industrial-900">{t.newSale}</h2>
        </div>
        <div className="p-6 space-y-6">

          {/* Customer Section */}
          <div className="rounded-xl border-2 border-industrial-200 bg-white p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-industrial-100">
                <User className="h-4 w-4 text-industrial-700" />
              </div>
              <h3 className="text-base font-bold text-industrial-800">Customer</h3>
            </div>

            {/* Mode tabs */}
            <div className="flex rounded-xl bg-industrial-100 p-1 gap-1 w-fit mb-5">
              {([
                { key: 'existing', label: 'Existing Customer' },
                { key: 'new', label: 'New Customer' },
              ] as const).map(m => (
                <button key={m.key} onClick={() => { setCustomerMode(m.key); setSelectedCustomerId(0); setCustomerSearch(''); }}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${customerMode === m.key ? 'bg-white text-industrial-900 shadow-sm' : 'text-industrial-500 hover:text-industrial-700'}`}>
                  {m.label}
                </button>
              ))}
            </div>

            {customerMode === 'existing' && (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-industrial-400" />
                  <input
                    className="h-11 w-full rounded-lg border-2 border-industrial-300 bg-white pl-9 pr-4 text-sm font-medium focus:border-accent-primary focus:outline-none"
                    placeholder="Search by name or phone..."
                    value={customerSearch}
                    onChange={e => setCustomerSearch(e.target.value)}
                  />
                </div>
                {selectedCustomerId > 0 ? (
                  <div className="flex items-center justify-between rounded-xl bg-blue-50 border-2 border-blue-200 px-4 py-3">
                    <div>
                      <p className="font-bold text-blue-900">{customers.find(c => c.id === selectedCustomerId)?.name}</p>
                      <p className="text-sm text-blue-600">{customers.find(c => c.id === selectedCustomerId)?.phone || 'No phone'}</p>
                    </div>
                    <button onClick={() => { setSelectedCustomerId(0); setCustomerSearch(''); }} className="rounded-full p-1.5 text-blue-400 hover:bg-blue-100">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto rounded-xl border-2 border-industrial-200 divide-y divide-industrial-100">
                    {filteredCustomers.length === 0
                      ? <p className="px-4 py-5 text-sm text-center text-industrial-400">No customers found</p>
                      : filteredCustomers.slice(0, 20).map(c => (
                        <button key={c.id} onClick={() => { setSelectedCustomerId(c.id); setCustomerSearch(c.name); }}
                          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-industrial-50 transition-colors">
                          <div>
                            <p className="font-semibold text-industrial-900 text-sm">{c.name}</p>
                            <p className="text-xs text-industrial-500">{c.phone || c.address || 'No contact info'}</p>
                          </div>
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${c.type === 'regular' ? 'bg-blue-100 text-blue-700' : c.type === 'contractor' ? 'bg-purple-100 text-purple-700' : 'bg-industrial-100 text-industrial-600'}`}>
                            {c.type || 'customer'}
                          </span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            )}

            {customerMode === 'new' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-industrial-700">Customer Name <span className="text-accent-danger">*</span></label>
                  <input className={inp} placeholder="e.g. Ali Khan" value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-industrial-700">Phone <span className="text-industrial-400 font-normal">(optional)</span></label>
                  <input className={inp} placeholder="e.g. 0300-1234567" value={newCustomerPhone} onChange={e => setNewCustomerPhone(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-industrial-700">Address <span className="text-industrial-400 font-normal">(optional)</span></label>
                  <input className={inp} placeholder="e.g. Street 5, Block A, Lahore" value={newCustomerAddress} onChange={e => setNewCustomerAddress(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          {/* Payment Type */}
          <div className="rounded-xl border-2 border-industrial-200 bg-white p-5">
            <h3 className="text-base font-bold text-industrial-800 mb-4">Payment Type</h3>
            <div className="flex flex-wrap gap-3 items-center">
              <button
                onClick={() => setSale({ ...sale, isCredit: false, credit_days: 0, due_date: '' })}
                className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold border-2 transition-all ${!sale.isCredit ? 'bg-green-600 border-green-600 text-white shadow-md' : 'bg-white border-industrial-300 text-industrial-500 hover:border-green-400 hover:text-green-700'}`}>
                💵 On-Site Payment (Cash)
              </button>
              <button
                onClick={() => setSale({ ...sale, isCredit: true })}
                className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold border-2 transition-all ${sale.isCredit ? 'bg-amber-500 border-amber-500 text-white shadow-md' : 'bg-white border-industrial-300 text-industrial-500 hover:border-amber-400 hover:text-amber-700'}`}>
                📋 Loan / Credit (Udhar)
              </button>
            </div>

            {sale.isCredit && (
              <div className="mt-4 flex flex-wrap gap-4 items-start">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-industrial-700">
                      Credit Days <span className="text-accent-danger">*</span>
                      <span className="text-industrial-400 font-normal ml-1">(how many days to pay)</span>
                    </label>
                    <Input type="number" className="w-36" placeholder="e.g. 30" value={sale.credit_days || ''} onChange={(e) => {
                      const days = Number(e.target.value || 0);
                      const dueDate = days ? new Date(new Date(sale.date).getTime() + days * 86400000).toISOString().slice(0, 10) : '';
                      setSale({ ...sale, credit_days: days, due_date: dueDate });
                    }} />
                  </div>
                  {sale.due_date ? (
                    <div className="rounded-xl bg-accent-secondary/10 border-2 border-accent-secondary/20 px-4 py-3 mt-1">
                      <p className="text-xs text-industrial-500 mb-0.5">Payment Due Date</p>
                      <p className="text-base font-bold text-accent-secondary">{new Date(sale.due_date).toLocaleDateString(locale, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 rounded-lg bg-accent-danger/10 border border-accent-danger/20 px-4 py-2 mt-1">
                      <AlertCircle className="h-4 w-4 text-accent-danger shrink-0" />
                      <span className="text-sm font-semibold text-accent-danger">Enter credit days to set the due date</span>
                    </div>
                  )}
              </div>
            )}
          </div>

          {/* Add Item */}
          <div className="rounded-xl border-2 border-industrial-200 bg-industrial-50 p-6">
            <p className="mb-4 text-sm font-bold text-industrial-700 uppercase tracking-wide">{t.addItem}</p>
            <div className="grid gap-4 sm:grid-cols-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-industrial-700">{t.selectProduct}</label>
                <select className={sel} value={draft.product_id} onChange={(e) => setDraft({ ...draft, product_id: Number(e.target.value) })}>
                  <option value={0}>{t.selectProduct}</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{localizeApiText(p.name, isUrdu)}</option>)}
                </select>
              </div>
              {selected?.category === 'cement' ? (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-industrial-700">{t.selectBrand}</label>
                  <select className={sel} value={draft.cement_brand_id || 0} onChange={(e) => setDraft({ ...draft, cement_brand_id: Number(e.target.value) })}>
                    <option value={0}>{t.selectBrand}</option>
                    {brands.map((b) => <option key={b.id} value={b.id}>{localizeApiText(b.brand_name, isUrdu)}</option>)}
                  </select>
                </div>
              ) : <div />}
              <div>
                <label className="mb-2 block text-sm font-semibold text-industrial-700">{isWeightBased ? t.weight : t.quantity}</label>
                <Input type="number" placeholder={isWeightBased ? t.weight_placeholder : '0'} value={draft.quantity || ''} onChange={(e) => setDraft({ ...draft, quantity: Number(e.target.value) })} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-industrial-700">{isWeightBased ? t.pricePerWeight : t.price}</label>
                <Input type="number" placeholder="0" value={draft.sale_price_per_unit || ''} onChange={(e) => setDraft({ ...draft, sale_price_per_unit: Number(e.target.value) })} />
              </div>
              <div className="flex items-end">
                <Button onClick={addItem} className="w-full h-11">
                  <Plus className="h-4 w-4 mr-2" /> {t.addItem}
                </Button>
              </div>
            </div>
          </div>

          {items.length > 0 && (
            <div className="overflow-auto rounded-xl border-2 border-industrial-200">
              <table className="w-full text-sm">
                <thead className="bg-industrial-100 text-industrial-700">
                  <tr>
                    <th className="px-6 py-4 text-left font-bold">{t.product}</th>
                    <th className="px-6 py-4 text-right font-bold">{t.quantity}</th>
                    <th className="px-6 py-4 text-right font-bold">{t.price}</th>
                    <th className="px-6 py-4 text-right font-bold">{t.total}</th>
                    <th className="px-6 py-4 w-16" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-t border-industrial-200 hover:bg-industrial-50">
                      <td className="px-6 py-4 font-semibold text-industrial-900">{localizeApiText(products.find((p) => p.id === item.product_id)?.name, isUrdu)}</td>
                      <td className="px-6 py-4 text-right text-industrial-700">{item.quantity}</td>
                      <td className="px-6 py-4 text-right text-industrial-700">{fmtCurrency(item.sale_price_per_unit)}</td>
                      <td className="px-6 py-4 text-right font-bold text-accent-primary">{fmtCurrency(item.total)}</td>
                      <td className="px-6 py-4 text-center">
                        <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-accent-danger hover:text-accent-danger/80 transition-colors">
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {items.length > 0 && (
            <div className="rounded-xl bg-industrial-50 border-2 border-industrial-200 p-6 space-y-5">
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center rounded-xl bg-white border-2 border-industrial-200 p-4">
                  <p className="text-sm font-semibold text-industrial-600 mb-1">Total Amount</p>
                  <p className="text-3xl font-bold text-industrial-900">{fmtCurrency(grandTotal)}</p>
                </div>
                <div className="text-center rounded-xl bg-white border-2 border-industrial-200 p-4">
                  <label className="text-sm font-semibold text-industrial-600 mb-1 block">
                    {sale.isCredit ? 'Advance / Partial Payment' : 'Amount Received'}
                  </label>
                  <Input type="number" className="text-center text-lg font-bold" placeholder="0" value={sale.amount_paid || ''} onChange={(e) => setSale({ ...sale, amount_paid: Number(e.target.value) })} />
                </div>
                <div className="text-center rounded-xl bg-white border-2 border-industrial-200 p-4">
                  <p className="text-sm font-semibold text-industrial-600 mb-1">
                    {sale.isCredit ? 'Balance on Credit' : 'Remaining Balance'}
                  </p>
                  <p className={`text-3xl font-bold ${pending > 0 ? 'text-accent-danger' : 'text-green-600'}`}>{fmtCurrency(pending)}</p>
                </div>
              </div>

              {sale.isCredit && pending > 0 && sale.due_date && (
                <div className="flex items-center gap-3 rounded-xl bg-accent-secondary/10 border-2 border-accent-secondary/20 px-5 py-3">
                  <AlertCircle className="h-5 w-5 text-accent-secondary shrink-0" />
                  <p className="text-sm font-semibold text-accent-secondary">
                    Rs {fmtCurrency(pending).replace('Rs ', '')} will be on credit — due by <strong>{new Date(sale.due_date).toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</strong>. After this date it becomes <strong>OVERDUE</strong>.
                  </p>
                </div>
              )}

              {!sale.isCredit && pending > 0 && (
                <div className="flex items-center gap-3 rounded-xl bg-accent-danger/10 border-2 border-accent-danger/20 px-5 py-3">
                  <AlertCircle className="h-5 w-5 text-accent-danger shrink-0" />
                  <p className="text-sm font-semibold text-accent-danger">
                    Rs {fmtCurrency(pending).replace('Rs ', '')} is still unpaid. Turn on <strong>Credit Sale</strong> if this is to be paid later, or enter the full amount received.
                  </p>
                </div>
              )}

              {validationError && (
                <div className="flex items-center gap-3 rounded-xl bg-accent-danger/10 border-2 border-accent-danger/20 px-5 py-3">
                  <AlertCircle className="h-5 w-5 text-accent-danger shrink-0" />
                  <p className="text-sm font-semibold text-accent-danger">{validationError}</p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className={`rounded-full px-5 py-2.5 text-sm font-bold uppercase tracking-wide ${sc[status]}`}>
                  {status === 'paid' ? '✓ Fully Paid' : status === 'partial' ? 'Partial Payment' : 'Pending / Unpaid'}
                </span>
                <Button onClick={submitSale} size="lg" className="px-10">
                  {t.completeSale}
                </Button>
              </div>
            </div>
          )}

          {savedMsg && (
            <div className="flex items-center justify-between rounded-xl bg-green-50 border-2 border-green-200 px-6 py-4">
              <span className="text-sm font-semibold text-green-800">{savedMsg}</span>
              {lastSaleReceipt && (
                <button
                  onClick={() => printReceipt(lastSaleReceipt)}
                  className="flex items-center gap-2 bg-industrial-800 hover:bg-industrial-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <Printer className="h-4 w-4" />
                  Print Receipt
                </button>
              )}
            </div>
          )}
        </div>
      </Card>

      <Card>
        <div className="border-b border-industrial-200 px-6 py-5 bg-industrial-50">
          <h2 className="text-xl font-bold text-industrial-900">{t.saleHistory}</h2>
        </div>
        <div className="divide-y divide-industrial-200">
          {allSales.length === 0 ? (
            <p className="px-6 py-8 text-center text-industrial-500 font-medium">{t.noData}</p>
          ) : allSales.slice(0, 30).map((s: any) => {
            const custName = s.customer?.name || s.customer_name || null;
            const isLoan = s.payment_type === 'credit' || (s.total_amount - (s.paid_amount ?? 0)) > 0;
            return (
              <div key={s.id} className="flex items-center justify-between px-6 py-4 hover:bg-industrial-50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full shrink-0 text-white text-sm font-black ${isLoan ? 'bg-amber-500' : 'bg-green-500'}`}>
                    {isLoan ? '📋' : '💵'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-industrial-900">{custName ? localizeApiText(custName, isUrdu) : <span className="text-industrial-400 italic">Walk-in</span>}</p>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isLoan ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                        {isLoan ? 'Loan / Udhar' : 'Cash'}
                      </span>
                    </div>
                    <p className="text-sm text-industrial-500">{new Date(s.date).toLocaleDateString(locale)}</p>
                    {s.due_date && (
                      <p className="text-xs text-industrial-400">Due: {new Date(s.due_date).toLocaleDateString(locale)}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-accent-primary">{fmtCurrency(s.total_amount)}</p>
                  <span className={`inline-block text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full ${sc[s.is_overdue ? 'overdue' : s.status]}`}>
                    {s.is_overdue ? t.overdue : s.status === 'paid' ? t.paid : s.status === 'partial' ? t.partial : t.pending}
                  </span>
                  <button
                    onClick={() => printExistingSale(s.id)}
                    className="mt-1 flex items-center gap-1 text-xs text-industrial-400 hover:text-industrial-800 transition-colors ml-auto"
                    title="Print Receipt"
                  >
                    <Printer className="h-3.5 w-3.5" /> Receipt
                  </button>
                  <div className="mt-1 flex justify-end">
                    <AttachmentManager
                      entityType="sale"
                      entityId={s.id}
                      label={`Sale #${s.id}`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

    </div>
  );
}


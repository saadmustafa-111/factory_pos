import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle, Package, Plus, Search, X } from 'lucide-react';
import { api } from '../lib/api';
import { useLang } from '../lib/i18n';
import { fmtCurrency } from '../lib/utils';
import { Modal } from '../components/ui/modal';
import { AttachmentManager } from '../components/AttachmentManager';

export interface AdvancePaymentItem {
  id: number;
  product_id: number;
  cement_brand_id?: number;
  product: { id: number; name: string; };
  cement_brand?: { id: number; brand_name: string; };
  quantity: number;
  quantity_picked: number;
  unit: string;
  rate_per_unit: number;
  total_amount: number;
}

export interface AdvancePayment {
  id: number;
  customer_id?: number;
  customer_name: string;
  customer_phone?: string;
  customer_address?: string;
  payment_date: string;
  paid_amount: number;
  total_amount: number;
  payment_method: string;
  expected_pickup_date?: string;
  status: 'pending' | 'partial' | 'completed' | 'cancelled';
  notes?: string;
  items: AdvancePaymentItem[];
  converted_sale_id?: number;
}

export interface Product {
  id: number;
  name: string;
  unit: string;
  category: string;
  is_active: boolean;
}

export interface CementBrand {
  id: number;
  brand_name: string;
}

export interface Customer {
  id: number;
  name: string;
  phone?: string;
  address?: string;
}

export default function AdvancePayments() {
  const { t, isUrdu } = useLang();
  const [searchParams, setSearchParams] = useSearchParams();
  const [advances, setAdvances] = useState<AdvancePayment[]>([]);
  const [filteredAdvances, setFilteredAdvances] = useState<AdvancePayment[]>([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [selectedAdvance, setSelectedAdvance] = useState<AdvancePayment | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cementBrands, setCementBrands] = useState<CementBrand[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    loadAdvances();
    loadProducts();
    loadCustomers();
  }, []);

  useEffect(() => {
    applyFilter();
  }, [statusFilter, searchQuery, advances]);

  useEffect(() => {
    if (searchParams.get('open') === '1') {
      setShowRecordModal(true);
    }
  }, [searchParams]);

  const loadAdvances = async () => {
    try {
      const res = await api.get('/advance-payments');
      setAdvances(res.data);
    } catch (err) {
      console.error('Failed to load advances:', err);
    }
  };

  const loadProducts = async () => {
    try {
      const [productsRes, brandsRes] = await Promise.all([
        api.get('/products'),
        api.get('/cement-brands'),
      ]);
      setProducts(productsRes.data.filter((p: Product) => p.is_active));
      setCementBrands(brandsRes.data);
    } catch (err) {
      console.error('Failed to load products:', err);
    }
  };

  const loadCustomers = async () => {
    try {
      const res = await api.get('/customers');
      setCustomers(res.data?.data ?? res.data ?? []);
    } catch (err) {
      console.error('Failed to load customers:', err);
    }
  };

  const applyFilter = () => {
    let filtered = advances;
    if (statusFilter !== 'all') {
      filtered = advances.filter((a) => a.status === statusFilter);
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((a) => {
        const itemText = a.items.map((item) => (
          `${item.product.name} ${item.cement_brand?.brand_name ?? ''} ${item.quantity} ${item.unit}`
        )).join(' ');
        return [
          a.customer_name,
          a.customer_phone,
          a.customer_address,
          a.payment_method,
          a.status,
          a.converted_sale_id ? `sale ${a.converted_sale_id}` : '',
          String(a.id),
          String(a.paid_amount),
          itemText,
        ].some((value) => String(value ?? '').toLowerCase().includes(q));
      });
    }
    setFilteredAdvances(filtered);
  };

  const handleOpenPickup = (advance: AdvancePayment) => {
    setSelectedAdvance(advance);
    setShowPickupModal(true);
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    partial: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-industrial-100 text-industrial-700',
  };

  const statusButtons = [
    { key: 'all', label: t.allCustomers },
    { key: 'pending', label: t.pendingAdvance },
    { key: 'partial', label: t.partialAdvance },
    { key: 'completed', label: t.completedAdvance },
  ];

  // Always recalculate summary from latest advances state
  const getSummary = (list: AdvancePayment[]) => {
    const totalAdvances = list.filter((a) => a.status !== 'cancelled').length;
    const pendingPickups = list.filter((a) => a.status === 'pending' || a.status === 'partial').length;
    const totalAmount = list
      .filter((a) => a.status === 'pending' || a.status === 'partial')
      .reduce((sum, a) => sum + a.paid_amount, 0);
    return { totalAdvances, pendingPickups, totalAmount };
  };
  const { totalAdvances, pendingPickups, totalAmount } = getSummary(advances);

  return (
    <div className={`flex flex-col h-[calc(100vh-9rem)] gap-3 ${isUrdu ? 'font-urdu' : ''}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <h1 className="text-2xl font-bold text-industrial-900">{t.advancePaymentsList}</h1>
        <button
          onClick={() => setShowRecordModal(true)}
          className="flex items-center gap-2 rounded-xl bg-accent-primary px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-accent-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> {t.recordAdvancePayment}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700 font-medium">{t.totalAdvances}</span>
            <Package className="h-5 w-5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-900 mt-1">{totalAdvances}</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-yellow-700 font-medium">{t.pendingPickups}</span>
            <Package className="h-5 w-5 text-yellow-600" />
          </div>
          <div className="text-2xl font-bold text-yellow-900 mt-1">{pendingPickups}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-green-700 font-medium">{t.advanceAmount}</span>
            <Package className="h-5 w-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-green-900 mt-1">{fmtCurrency(totalAmount)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <div className="relative min-w-64 flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-industrial-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isUrdu ? 'تلاش...' : 'Search customer, phone, item, sale...'}
            className="h-10 w-full rounded-xl border-2 border-industrial-200 bg-white pl-9 pr-3 text-sm font-medium outline-none focus:border-accent-primary"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {statusButtons.map((btn) => (
            <button
              key={btn.key}
              onClick={() => setStatusFilter(btn.key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === btn.key
                  ? 'bg-industrial-700 text-white'
                  : 'bg-industrial-100 text-industrial-700 hover:bg-industrial-200'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Advance Payments Table */}
      <div className="flex-1 flex flex-col rounded-xl border-2 border-industrial-200 bg-white overflow-hidden min-h-0">
        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-industrial-800 text-white z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">{t.date}</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">{t.customer}</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">{t.items}</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">{t.advanceAmount}</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">{t.expectedPickup}</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">{t.status}</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">{t.action}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-industrial-100">
              {filteredAdvances.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-industrial-500">
                    {t.noData}
                  </td>
                </tr>
              ) : (
                filteredAdvances.map((adv) => (
                  <tr key={adv.id} className="hover:bg-industrial-50 transition-colors">
                    <td className="px-4 py-3 text-sm">{new Date(adv.payment_date).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-industrial-900">{adv.customer_name}</div>
                      {adv.customer_phone && <div className="text-sm text-industrial-500">{adv.customer_phone}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {adv.items.map((item, idx) => (
                        <div key={idx} className="text-xs">
                          {item.product.name}
                          {item.cement_brand && ` (${item.cement_brand.brand_name})`}
                          {' × '}
                          {item.quantity} {item.unit}
                          {item.quantity_picked > 0 && (
                            <span className="text-green-600 ml-1">({item.quantity_picked} picked)</span>
                          )}
                        </div>
                      ))}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">{fmtCurrency(adv.paid_amount)}</td>
                    <td className="px-4 py-3 text-sm">
                      {adv.expected_pickup_date
                        ? new Date(adv.expected_pickup_date).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColors[adv.status]}`}>
                        {adv.status === 'pending' && t.pendingAdvance}
                        {adv.status === 'partial' && t.partialAdvance}
                        {adv.status === 'completed' && t.completedAdvance}
                        {adv.status === 'cancelled' && t.cancelledAdvance}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {(adv.status === 'pending' || adv.status === 'partial') && (
                          <button
                            onClick={() => handleOpenPickup(adv)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            {t.processPickup}
                          </button>
                        )}
                        {adv.status === 'completed' && adv.converted_sale_id && (
                          <span className="text-green-600 text-sm">✓ Sale #{adv.converted_sale_id}</span>
                        )}
                        <AttachmentManager
                          entityType="advance_payment"
                          entityId={adv.id}
                          label={`Advance Payment #${adv.id}`}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Advance Payment Modal */}
      {showRecordModal && (
        <RecordAdvanceModal
          products={products}
          cementBrands={cementBrands}
          customers={customers}
          initialCustomerId={Number(searchParams.get('customer')) || undefined}
          onClose={() => {
            setShowRecordModal(false);
            setSearchParams({});
          }}
          onCreated={() => {
            setShowRecordModal(false);
            setSearchParams({});
            loadAdvances();
          }}
        />
      )}

      {/* Process Pickup Modal */}
      {showPickupModal && selectedAdvance && (
        <ProcessPickupModal
          advance={selectedAdvance}
          onClose={() => {
            setShowPickupModal(false);
            setSelectedAdvance(null);
          }}
          onProcessed={async () => {
            setShowPickupModal(false);
            setSelectedAdvance(null);
            await loadAdvances();
          }}
        />
      )}
    </div>
  );
}

// Record Advance Payment Modal Component
export function RecordAdvanceModal({
  products,
  cementBrands,
  customers,
  initialCustomerId,
  onClose,
  onCreated,
}: {
  products: Product[];
  cementBrands: CementBrand[];
  customers: Customer[];
  initialCustomerId?: number;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t, isUrdu } = useLang();
  const [customerId, setCustomerId] = useState<number | ''>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [expectedPickupDate, setExpectedPickupDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<{
    product_id: number;
    cement_brand_id?: number;
    quantity: number;
    unit: string;
    rate_per_unit: number;
  }[]>([]);

  const handleSelectCustomer = (id: number) => {
    const customer = customers.find((c) => c.id === id);
    if (customer) {
      setCustomerId(id);
      setCustomerName(customer.name);
      setCustomerPhone(customer.phone || '');
      setCustomerAddress(customer.address || '');
    }
  };

  useEffect(() => {
    if (initialCustomerId && customers.some((c) => c.id === initialCustomerId)) {
      handleSelectCustomer(initialCustomerId);
    }
  }, [initialCustomerId, customers]);

  const handleAddItem = () => {
    setItems([...items, { product_id: 0, quantity: 0, unit: '', rate_per_unit: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;

    // Auto-fill unit when product is selected
    if (field === 'product_id') {
      const product = products.find((p) => p.id === value);
      if (product) {
        updated[index].unit = product.unit;
      }
    }

    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/advance-payments', {
        customer_id: customerId || undefined,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_address: customerAddress,
        payment_date: paymentDate,
        paid_amount: parseFloat(paidAmount),
        payment_method: paymentMethod,
        expected_pickup_date: expectedPickupDate || undefined,
        notes,
        items,
      });
      onCreated();
    } catch (err) {
      console.error('Failed to record advance payment:', err);
      alert('Failed to record advance payment');
    }
  };

  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.rate_per_unit, 0);

  return (
    <Modal open title={t.recordAdvancePayment} onClose={onClose}>
      <form onSubmit={handleSubmit} className={`space-y-4 ${isUrdu ? 'font-urdu' : ''}`}>
        {/* Customer Selection */}
        <div>
          <label className="block text-sm font-medium mb-1">{t.customer}</label>
          <select
            value={customerId}
            onChange={(e) =>
              e.target.value
                ? handleSelectCustomer(parseInt(e.target.value))
                : (setCustomerId(''), setCustomerName(''), setCustomerPhone(''), setCustomerAddress(''))
            }
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="">{t.selectCustomer}</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.phone && `(${c.phone})`}
              </option>
            ))}
          </select>
        </div>

        {/* New Customer Fields */}
        {!customerId && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">{t.customerName}</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t.phone}</label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t.address}</label>
              <input
                type="text"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </>
        )}

        {/* Payment Details */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t.paymentDate}</label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t.expectedPickup}</label>
            <input
              type="date"
              value={expectedPickupDate}
              onChange={(e) => setExpectedPickupDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t.advanceAmount}</label>
            <input
              type="number"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              required
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t.paymentMethod}</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="cash">{t.cashMethod}</option>
              <option value="bank_transfer">{t.bankTransfer}</option>
              <option value="cheque">{t.cheque}</option>
              <option value="jazzcash">{t.jazzcash}</option>
              <option value="easypaisa">{t.easypaisa}</option>
            </select>
          </div>
        </div>

        {/* Items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium">{t.items}</label>
            <button
              type="button"
              onClick={handleAddItem}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              <Plus className="h-4 w-4 inline" /> {t.addItem}
            </button>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 bg-industrial-50 rounded">
                <select
                  value={item.product_id}
                  onChange={(e) => handleItemChange(idx, 'product_id', parseInt(e.target.value))}
                  required
                  className="flex-1 px-2 py-1 border rounded text-sm"
                >
                  <option value={0}>{t.selectProduct}</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {products.find((p) => p.id === item.product_id)?.category === 'cement' && (
                  <select
                    value={item.cement_brand_id || 0}
                    onChange={(e) => handleItemChange(idx, 'cement_brand_id', parseInt(e.target.value) || undefined)}
                    className="flex-1 px-2 py-1 border rounded text-sm"
                  >
                    <option value={0}>{t.selectBrand}</option>
                    {cementBrands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.brand_name}
                      </option>
                    ))}
                  </select>
                )}
                <input
                  type="number"
                  value={item.quantity || ''}
                  onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                  placeholder={t.quantity}
                  required
                  min="0.01"
                  step="0.01"
                  className="w-20 px-2 py-1 border rounded text-sm"
                />
                <input
                  type="number"
                  value={item.rate_per_unit || ''}
                  onChange={(e) => handleItemChange(idx, 'rate_per_unit', parseFloat(e.target.value) || 0)}
                  placeholder={t.price}
                  required
                  min="0"
                  step="0.01"
                  className="w-24 px-2 py-1 border rounded text-sm"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveItem(idx)}
                  className="text-red-600 hover:text-red-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Total Display */}
        {totalAmount > 0 && (
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{t.total}:</span>
              <span className="font-bold text-industrial-900">{fmtCurrency(totalAmount)}</span>
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium mb-1">{t.notes}</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-industrial-200 rounded-lg hover:bg-industrial-50"
          >
            {t.cancel}
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-secondary"
          >
            {t.save}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// Process Pickup Modal Component
export function ProcessPickupModal({
  advance,
  onClose,
  onProcessed,
}: {
  advance: AdvancePayment;
  onClose: () => void;
  onProcessed: () => void;
}) {
  const { t, isUrdu } = useLang();
  const [pickupDate, setPickupDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<{ advance_payment_item_id: number; quantity: number }[]>(
    advance.items.map((item) => ({
      advance_payment_item_id: item.id,
      quantity: item.quantity - item.quantity_picked,
    }))
  );
  const [additionalPayment, setAdditionalPayment] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/advance-payments/${advance.id}/pickup`, {
        pickup_date: pickupDate,
        items: items.filter((i) => i.quantity > 0),
        additional_payment: additionalPayment ? parseFloat(additionalPayment) : undefined,
        notes,
      });
      onProcessed();
    } catch (err: any) {
      console.error('Failed to process pickup:', err);
      alert(err.response?.data?.message || 'Failed to process pickup');
    }
  };

  const handleQuantityChange = (itemId: number, quantity: number) => {
    setItems(items.map((i) => (i.advance_payment_item_id === itemId ? { ...i, quantity } : i)));
  };

  return (
    <Modal open title={t.processPickup} onClose={onClose}>
      <form onSubmit={handleSubmit} className={`space-y-4 ${isUrdu ? 'font-urdu' : ''}`}>
        {/* Customer Info */}
        <div className="bg-industrial-50 p-3 rounded-lg">
          <div className="font-medium text-industrial-900">{advance.customer_name}</div>
          {advance.customer_phone && <div className="text-sm text-industrial-600">{advance.customer_phone}</div>}
        </div>

        {/* Pickup Date */}
        <div>
          <label className="block text-sm font-medium mb-1">{t.pickupDate}</label>
          <input
            type="date"
            value={pickupDate}
            onChange={(e) => setPickupDate(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        {/* Items to Pickup */}
        <div>
          <label className="block text-sm font-medium mb-2">{t.items}</label>
          <div className="space-y-2">
            {advance.items.map((item, idx) => {
              const remaining = item.quantity - item.quantity_picked;
              const pickupQty = items.find((i) => i.advance_payment_item_id === item.id)?.quantity || 0;
              return (
                <div key={item.id} className="flex items-center gap-2 p-2 bg-industrial-50 rounded">
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      {item.product.name}
                      {item.cement_brand && ` (${item.cement_brand.brand_name})`}
                    </div>
                    <div className="text-xs text-industrial-600">
                      {t.remainingQuantity}: {remaining} {item.unit}
                    </div>
                  </div>
                  <input
                    type="number"
                    value={pickupQty}
                    onChange={(e) => handleQuantityChange(item.id, parseFloat(e.target.value) || 0)}
                    max={remaining}
                    min="0"
                    step="0.01"
                    className="w-24 px-2 py-1 border rounded text-sm"
                    placeholder={t.quantityToPickup}
                  />
                  <span className="text-sm text-industrial-500">{item.unit}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Additional Payment */}
        <div>
          <label className="block text-sm font-medium mb-1">{t.additionalPayment}</label>
          <input
            type="number"
            value={additionalPayment}
            onChange={(e) => setAdditionalPayment(e.target.value)}
            min="0"
            step="0.01"
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="0"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium mb-1">{t.notes}</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-industrial-200 rounded-lg hover:bg-industrial-50"
          >
            {t.cancel}
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <CheckCircle className="h-4 w-4" /> {t.processPickup}
          </button>
        </div>
      </form>
    </Modal>
  );
}

import { useEffect, useState } from 'react';
import { PackageSearch } from 'lucide-react';
import { api } from '../lib/api';
import { Modal } from './ui/modal';
import { Button } from './ui/button';

interface Product {
  id: number;
  name: string;
  unit: string;  // kg | piece | bag | bundle | maund | ton
  category: string;
}

interface Props {
  customerId: number;
  customerName: string;
  onClose: () => void;
  onCreated: () => void;
}

// Weight-based units — show label as "Weight"
const WEIGHT_UNITS = new Set(['kg', 'maund', 'ton']);

export function AddPreviousCreditModal({ customerId, customerName, onClose, onCreated }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [qty, setQty] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Product[]>('/products').then(r => setProducts(r.data)).catch(() => {});
  }, []);

  const isWeight = selectedProduct ? WEIGHT_UNITS.has(selectedProduct.unit) : false;
  const qtyLabel = isWeight ? 'Weight' : 'Quantity';
  const qtyNum = parseFloat(qty) || 0;
  const priceNum = parseFloat(unitPrice) || 0;
  const total = qtyNum * priceNum;

  const itemDescription = selectedProduct
    ? `${selectedProduct.name} — ${qty || '0'} ${selectedProduct.unit} @ Rs.${unitPrice || '0'}/${selectedProduct.unit}`
    : '';

  const submit = async () => {
    if (!selectedProduct) { setError('Please select a product.'); return; }
    if (qtyNum <= 0) { setError(`Please enter a valid ${qtyLabel.toLowerCase()}.`); return; }
    if (priceNum <= 0) { setError('Please enter a valid unit price.'); return; }
    setError('');
    setLoading(true);
    try {
      await api.post(`/customers/${customerId}/manual-credit`, {
        item_description: itemDescription,
        amount: total,
        credit_date: date,
        notes: notes.trim() || undefined,
      });
      onCreated();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open title="Add Previous Credit" onClose={onClose}>
      <div className="space-y-4">

        {error && (
          <div className="rounded-lg bg-red-50 border-2 border-red-200 px-4 py-3">
            <p className="text-sm font-semibold text-red-700">⚠ {error}</p>
          </div>
        )}

        {/* Product picker */}
        <div>
          <label className="block text-sm font-bold text-industrial-800 mb-2">
            <span className="inline-flex items-center gap-1.5"><PackageSearch className="w-4 h-4" /> Select Product <span className="text-red-500">*</span></span>
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {products.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => { setSelectedProduct(p); setQty(''); setUnitPrice(''); setError(''); }}
                className={`rounded-xl border-2 px-3 py-2.5 text-left transition-all ${
                  selectedProduct?.id === p.id
                    ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                    : 'border-industrial-200 bg-white hover:border-industrial-400 text-industrial-700'
                }`}
              >
                <p className="text-sm font-bold truncate">{p.name}</p>
                <p className="text-[11px] text-industrial-400 mt-0.5">{WEIGHT_UNITS.has(p.unit) ? 'by weight' : 'by piece'} · {p.unit}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Quantity + Unit Price row — only show after product selected */}
        {selectedProduct && (
          <>
            <div className="grid grid-cols-2 gap-4">
              {/* Qty / Weight */}
              <div>
                <label className="block text-sm font-bold text-industrial-800 mb-2">
                  {qtyLabel} <span className="text-industrial-400 font-normal">({selectedProduct.unit})</span> <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  autoFocus
                  className="w-full h-12 rounded-lg border-2 border-industrial-300 bg-white px-4 text-base font-medium focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 focus:outline-none transition-all"
                  placeholder={isWeight ? 'e.g. 100' : 'e.g. 10'}
                  value={qty}
                  onChange={e => { setQty(e.target.value); setError(''); }}
                />
              </div>

              {/* Unit price */}
              <div>
                <label className="block text-sm font-bold text-industrial-800 mb-2">
                  Price per {selectedProduct.unit} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-industrial-400">Rs.</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="w-full h-12 rounded-lg border-2 border-industrial-300 bg-white pl-10 pr-4 text-base font-medium focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 focus:outline-none transition-all"
                    placeholder="0"
                    value={unitPrice}
                    onChange={e => { setUnitPrice(e.target.value); setError(''); }}
                  />
                </div>
              </div>
            </div>

            {/* Auto total */}
            <div className={`rounded-xl p-4 flex items-center justify-between ${
              total > 0 ? 'bg-green-50 border-2 border-green-200' : 'bg-industrial-50 border-2 border-industrial-200'
            }`}>
              <div>
                <p className="text-xs text-industrial-500 font-medium">{selectedProduct.name}</p>
                <p className="text-xs text-industrial-400">{qty || '0'} {selectedProduct.unit} × Rs.{unitPrice || '0'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-industrial-500">Total</p>
                <p className={`text-xl font-bold ${ total > 0 ? 'text-green-700' : 'text-industrial-400' }`}>
                  Rs. {total > 0 ? total.toLocaleString() : '0'}
                </p>
              </div>
            </div>
          </>
        )}

        {/* Date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-industrial-800 mb-2">Date</label>
            <input
              type="date"
              className="w-full h-11 rounded-lg border-2 border-industrial-300 bg-white px-4 text-sm font-medium focus:border-accent-primary focus:outline-none transition-all"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-industrial-800 mb-2">Notes <span className="font-normal text-industrial-400">(optional)</span></label>
            <input
              type="text"
              className="w-full h-11 rounded-lg border-2 border-industrial-200 bg-white px-4 text-sm font-medium focus:border-accent-primary focus:outline-none transition-all"
              placeholder="Any extra details..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={loading || !selectedProduct || total <= 0} className="px-8">
            {loading ? 'Saving...' : `✓ Add Credit  Rs. ${total > 0 ? total.toLocaleString() : '0'}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}


import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowDownCircle, BadgeCheck, Calendar, ChevronRight, Clock, Info, MapPin, Package, Pencil, Plus, Search, Trash2, Truck, X } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Modal } from '../components/ui/modal';
import { api } from '../lib/api';
import { useLang } from '../lib/i18n';
import { localizeApiText, localizeApiUnit } from '../lib/localize';
import { Product } from '../lib/types';
import { fmtCurrency } from '../lib/utils';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

function toNumber(value: string) {
  if (value === '') return 0;
  return Number(value);
}

function matchesSearch(value: string, query: string) {
  return value.toLowerCase().includes(query.trim().toLowerCase());
}

function stockKey(row: any) {
  const productId = Number(row.product_id || row.product?.id || 0);
  const brandId = Number(row.cement_brand_id || row.cement_brand?.id || 0);
  return `${productId}-${brandId}`;
}

function productKey(row: any) {
  return String(Number(row.product_id || row.product?.id || 0));
}

function PaginationBar({
  currentPage,
  totalPages,
  pageSize,
  totalRows,
  onPageChange,
  onPageSizeChange,
  isUrdu,
}: {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalRows: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  isUrdu: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-industrial-200 bg-industrial-50 px-4 py-3 md:flex-row md:items-center md:justify-between">
      <div className="text-sm text-industrial-600">
        {isUrdu ? `کل ${totalRows} ریکارڈز` : `Total ${totalRows} records`}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-industrial-500">
          {isUrdu ? 'فی صفحہ' : 'Rows'}
        </label>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="h-9 rounded-lg border-2 border-industrial-300 bg-white px-3 text-sm font-medium"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          {isUrdu ? 'پچھلا' : 'Prev'}
        </Button>

        <div className="rounded-lg border border-industrial-300 bg-white px-3 py-1.5 text-sm font-semibold text-industrial-700">
          {isUrdu ? `${currentPage} / ${Math.max(1, totalPages)}` : `Page ${currentPage} of ${Math.max(1, totalPages)}`}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
        >
          {isUrdu ? 'اگلا' : 'Next'}
        </Button>
      </div>
    </div>
  );
}

export default function Inventory() {
    const [stockCategory, setStockCategory] = useState<'all' | 'cement' | 'steel'>('all');
  const { t, isUrdu } = useLang();
  const locale = isUrdu ? 'ur-PK' : 'en-PK';
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [stock, setStock] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addStockOpen, setAddStockOpen] = useState(false);
  const [editingInventoryId, setEditingInventoryId] = useState<number | null>(null);
  const [entryType, setEntryType] = useState<'purchase' | 'opening'>('purchase');
  const [stockQuery, setStockQuery] = useState('');
  const [historyQuery, setHistoryQuery] = useState('');
  const [stockPage, setStockPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [stockPageSize, setStockPageSize] = useState(10);
  const [historyPageSize, setHistoryPageSize] = useState(10);
  const [form, setForm] = useState({
    supplier_id: 0,
    product_id: 0,
    cement_brand_id: 0,
    date: new Date().toISOString().slice(0, 10),
    pickup_date: new Date().toISOString().slice(0, 10),
    delivery_date: '',
    delivery_location: '',
    transport_details: '',
    quantity_received: 0,
    purchase_price_per_unit: 0,
    amount_paid_to_mill: 0,
    amount_received_from_mill: 0,
    credit_days: 0,
    notes: '',
  });

  const selectedProduct = products.find((p) => p.id === Number(form.product_id));

  const netPaidToMill = useMemo(
    () => Math.max(0, Number(form.amount_paid_to_mill || 0) - Number(form.amount_received_from_mill || 0)),
    [form.amount_paid_to_mill, form.amount_received_from_mill],
  );

  const totalCost = useMemo(
    () => Number(form.quantity_received || 0) * Number(form.purchase_price_per_unit || 0),
    [form.quantity_received, form.purchase_price_per_unit],
  );

  const pendingToMill = useMemo(
    () => Math.max(0, totalCost - netPaidToMill),
    [totalCost, netPaidToMill],
  );

  const overpaymentAmount = useMemo(
    () => Math.max(0, netPaidToMill - totalCost),
    [totalCost, netPaidToMill],
  );

  const paymentStatus = pendingToMill === 0 ? 'paid' : netPaidToMill > 0 ? 'partial' : 'pending';

  const stockDisplayRows = useMemo(() => {
    const historyGroups = new Map<string, any>();

    history.forEach((entry) => {
      const brandId = Number(entry.cement_brand_id || entry.cement_brand?.id || 0);
      if (entry.product?.category !== 'cement' || brandId <= 0) return;

      const key = stockKey(entry);
      const quantity = Number(entry.quantity_received || 0);
      const price = Number(entry.purchase_price_per_unit || 0);
      const value = Number(entry.total_cost || quantity * price);
      const current = historyGroups.get(key);

      if (current) {
        current.stock += quantity;
        current.total_value += value;
        current.unit_price = current.stock > 0 ? current.total_value / current.stock : 0;
        return;
      }

      historyGroups.set(key, {
        product_id: Number(entry.product_id || entry.product?.id || 0),
        cement_brand_id: brandId,
        product: entry.product,
        cement_brand: entry.cement_brand,
        stock: quantity,
        unit_price: price,
        total_value: value,
        last_updated: entry.created_at || entry.date,
      });
    });

    return stock.flatMap((row) => {
      const isGenericCement = row.product?.category === 'cement' && !Number(row.cement_brand_id || row.cement_brand?.id || 0);
      if (!isGenericCement) return [row];

      const brandRows = Array.from(historyGroups.values()).filter(
        (entry) => Number(entry.product_id || entry.product?.id || 0) === Number(row.product_id || row.product?.id || 0),
      );
      if (brandRows.length === 0) return [row];

      const totalBrandStock = brandRows.reduce((sum, entry) => sum + Number(entry.stock || 0), 0);
      const currentStock = Number(row.stock || 0);
      const stockRatio = totalBrandStock > 0 && currentStock < totalBrandStock ? currentStock / totalBrandStock : 1;

      return brandRows.map((entry) => {
        const adjustedStock = Number(entry.stock || 0) * stockRatio;
        return {
          ...entry,
          stock: adjustedStock,
          total_value: adjustedStock * Number(entry.unit_price || 0),
          last_updated: row.last_updated || entry.last_updated,
        };
      });
    });
  }, [stock, history]);

  const filteredStock = useMemo(() => {
    let filtered = stockDisplayRows;
    if (stockCategory === 'cement') {
      filtered = filtered.filter((row) => row.product?.category === 'cement');
    } else if (stockCategory === 'steel') {
      filtered = filtered.filter((row) =>
        row.product?.category === 'sariya' ||
        row.product?.category === 'rings' ||
        row.product?.category === 'wire'
      );
    }
    if (!stockQuery.trim()) return filtered;
    return filtered.filter((row) => {
      const name = String(localizeApiText(row.product?.name, isUrdu) || '');
      const typeBrand = String(localizeApiText(row.cement_brand?.brand_name || row.product?.type, isUrdu) || '');
      return matchesSearch(`${name} ${typeBrand}`, stockQuery);
    });
  }, [stockDisplayRows, stockQuery, isUrdu, stockCategory]);

  const historyPriceByStockKey = useMemo(() => {
    const prices = new Map<string, number>();
    const totalsByStockKey = new Map<string, { quantity: number; value: number }>();
    const totalsByProductKey = new Map<string, { quantity: number; value: number }>();

    history.forEach((row) => {
      const key = stockKey(row);
      const productOnlyKey = productKey(row);
      const quantity = Number(row.quantity_received || 0);
      const price = Number(row.purchase_price_per_unit || 0);
      const value = Number(row.total_cost || quantity * price);

      if (quantity > 0 && value > 0) {
        const stockTotal = totalsByStockKey.get(key) || { quantity: 0, value: 0 };
        totalsByStockKey.set(key, {
          quantity: stockTotal.quantity + quantity,
          value: stockTotal.value + value,
        });

        const productTotal = totalsByProductKey.get(productOnlyKey) || { quantity: 0, value: 0 };
        totalsByProductKey.set(productOnlyKey, {
          quantity: productTotal.quantity + quantity,
          value: productTotal.value + value,
        });
      }
    });

    totalsByStockKey.forEach((total, key) => {
      if (total.quantity > 0) {
        prices.set(key, total.value / total.quantity);
      }
    });

    totalsByProductKey.forEach((total, key) => {
      if (total.quantity > 0) {
        prices.set(`product:${key}`, total.value / total.quantity);
      }
    });

    return prices;
  }, [history]);

  const getStockUnitPrice = (row: any) => {
    const apiPrice = Number(row.unit_price || 0);
    if (apiPrice > 0) return apiPrice;

    const historyPrice = historyPriceByStockKey.get(stockKey(row)) || 0;
    if (historyPrice > 0) return historyPrice;

    const productHistoryPrice = historyPriceByStockKey.get(`product:${productKey(row)}`) || 0;
    if (productHistoryPrice > 0) return productHistoryPrice;

    const quantity = Number(row.stock || 0);
    const value = Number(row.total_value || 0);
    return quantity > 0 ? value / quantity : 0;
  };

  const getStockValue = (row: any) => Number(row.stock || 0) * getStockUnitPrice(row);

  const totalStockValue = useMemo(
    () => stockDisplayRows.reduce((sum, row) => sum + getStockValue(row), 0),
    [stockDisplayRows, historyPriceByStockKey],
  );

  const filteredStockValue = useMemo(
    () => filteredStock.reduce((sum, row) => sum + getStockValue(row), 0),
    [filteredStock, historyPriceByStockKey],
  );

  const filteredHistory = useMemo(() => {
    let filtered = history;
    if (stockCategory === 'cement') {
      filtered = filtered.filter((row) => row.product?.category === 'cement');
    } else if (stockCategory === 'steel') {
      filtered = filtered.filter((row) =>
        row.product?.category === 'sariya' ||
        row.product?.category === 'rings' ||
        row.product?.category === 'wire'
      );
    }
    if (!historyQuery.trim()) return filtered;
    return filtered.filter((row) => {
      const searchable = [
        localizeApiText(row.supplier?.name, isUrdu),
        localizeApiText(row.product?.name, isUrdu),
        row.delivery_location,
        row.payment_status,
      ]
        .filter(Boolean)
        .join(' ');
      return matchesSearch(searchable, historyQuery);
    });
  }, [history, historyQuery, isUrdu, stockCategory]);

  const stockTotalPages = Math.max(1, Math.ceil(filteredStock.length / stockPageSize));
  const historyTotalPages = Math.max(1, Math.ceil(filteredHistory.length / historyPageSize));

  const paginatedStock = useMemo(() => {
    const start = (stockPage - 1) * stockPageSize;
    return filteredStock.slice(start, start + stockPageSize);
  }, [filteredStock, stockPage, stockPageSize]);

  const paginatedHistory = useMemo(() => {
    const start = (historyPage - 1) * historyPageSize;
    return filteredHistory.slice(start, start + historyPageSize);
  }, [filteredHistory, historyPage, historyPageSize]);

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

  useEffect(() => {
    setStockPage(1);
  }, [stockQuery, stockPageSize]);

  useEffect(() => {
    setHistoryPage(1);
  }, [historyQuery, historyPageSize]);

  useEffect(() => {
    if (stockPage > stockTotalPages) {
      setStockPage(stockTotalPages);
    }
  }, [stockPage, stockTotalPages]);

  useEffect(() => {
    if (historyPage > historyTotalPages) {
      setHistoryPage(historyTotalPages);
    }
  }, [historyPage, historyTotalPages]);

  const resetForm = () => {
    setEditingInventoryId(null);
    setEntryType('purchase');
    setForm({
      supplier_id: 0,
      product_id: 0,
      cement_brand_id: 0,
      date: new Date().toISOString().slice(0, 10),
      pickup_date: new Date().toISOString().slice(0, 10),
      delivery_date: '',
      delivery_location: '',
      transport_details: '',
      quantity_received: 0,
      purchase_price_per_unit: 0,
      amount_paid_to_mill: 0,
      amount_received_from_mill: 0,
      credit_days: 0,
      notes: '',
    });
  };

  const openAddStock = () => {
    resetForm();
    setAddStockOpen(true);
  };

  const openEditStock = (row: any) => {
    const nextEntryType = row.entry_type === 'opening' ? 'opening' : 'purchase';
    setEditingInventoryId(row.id);
    setEntryType(nextEntryType);
    setForm({
      supplier_id: Number(row.supplier_id || row.supplier?.id || 0),
      product_id: Number(row.product_id || row.product?.id || 0),
      cement_brand_id: Number(row.cement_brand_id || row.cement_brand?.id || 0),
      date: String(row.date).slice(0, 10),
      pickup_date: row.pickup_date ? String(row.pickup_date).slice(0, 10) : '',
      delivery_date: row.delivery_date ? String(row.delivery_date).slice(0, 10) : '',
      delivery_location: row.delivery_location || '',
      transport_details: row.transport_details || '',
      quantity_received: Number(row.quantity_received || 0),
      purchase_price_per_unit: Number(row.purchase_price_per_unit || 0),
      amount_paid_to_mill: Number(row.amount_paid_to_mill || 0),
      amount_received_from_mill: Number(row.amount_received_from_mill || 0),
      credit_days: Number(row.credit_days || 0),
      notes: row.notes || '',
    });
    setAddStockOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        entry_type: entryType,
        supplier_id: entryType === 'purchase' ? Number(form.supplier_id) : undefined,
        product_id: Number(form.product_id),
        cement_brand_id: form.cement_brand_id || undefined,
        quantity_received: Number(form.quantity_received),
        purchase_price_per_unit: Number(form.purchase_price_per_unit),
        amount_paid_to_mill: entryType === 'purchase' ? Number(form.amount_paid_to_mill || 0) : undefined,
        amount_received_from_mill: entryType === 'purchase' ? Number(form.amount_received_from_mill || 0) : undefined,
        date: form.date,
        pickup_date: entryType === 'purchase' && form.pickup_date ? form.pickup_date : undefined,
        delivery_date: entryType === 'purchase' && form.delivery_date ? form.delivery_date : undefined,
        delivery_location: entryType === 'purchase' && form.delivery_location ? form.delivery_location : undefined,
        transport_details: entryType === 'purchase' && form.transport_details ? form.transport_details : undefined,
        credit_days: entryType === 'purchase' && form.credit_days ? Number(form.credit_days) : undefined,
        notes: form.notes,
      };
      if (editingInventoryId) {
        await api.put(`/inventory/${editingInventoryId}`, payload);
      } else {
        await api.post('/inventory', payload);
      }
      resetForm();
      setAddStockOpen(false);
      await load();
    } finally {
      setIsSubmitting(false);
    }
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
    <div className={`flex flex-col h-[calc(100vh-9rem)] gap-3 ${isUrdu ? 'font-urdu' : ''}`}>

      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-industrial-900">{isUrdu ? 'اسٹاک ان' : 'Stock In'}</h1>
          <p className="mt-0.5 text-sm text-industrial-500">
            {isUrdu ? 'اسٹاک کی موجودہ مقدار اور تاریخ دیکھیں' : 'View current stock levels and incoming stock history'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border-2 border-industrial-200 bg-white px-4 py-2.5">
            <Package className="h-4 w-4 text-accent-primary" />
            <span className="text-xs font-semibold text-industrial-500 uppercase tracking-wide">{isUrdu ? 'اسٹاک' : 'Stock'}</span>
            <span className="text-lg font-bold text-industrial-900">{stockDisplayRows.length}</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border-2 border-industrial-200 bg-white px-4 py-2.5">
            <span className="text-xs font-black text-green-700">PKR</span>
            <span className="text-xs font-semibold text-industrial-500 uppercase tracking-wide">{isUrdu ? 'مالیت' : 'Stock Value'}</span>
            <span className="text-lg font-bold text-industrial-900 tabular-nums">{fmtCurrency(totalStockValue)}</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border-2 border-industrial-200 bg-white px-4 py-2.5">
            <Calendar className="h-4 w-4 text-accent-secondary" />
            <span className="text-xs font-semibold text-industrial-500 uppercase tracking-wide">{isUrdu ? 'انٹریاں' : 'Entries'}</span>
            <span className="text-lg font-bold text-industrial-900">{history.length}</span>
          </div>
          <Button
            size="lg"
            className="gap-2 px-6 shadow-sm"
            onClick={openAddStock}
          >
            <Plus className="h-5 w-5" />
            {isUrdu ? 'اسٹاک شامل کریں' : 'Add Stock'}
          </Button>
        </div>
      </div>

      {/* ── Add Stock Modal ── */}
      {addStockOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 overflow-hidden">

            {/* ── Modal Header ── */}
            <div className="shrink-0 bg-gradient-to-r from-industrial-800 to-industrial-900 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
                  <ArrowDownCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{editingInventoryId ? 'Edit Stock Entry' : t.addStock}</h2>
                  <p className="text-xs text-industrial-300 mt-0.5">{editingInventoryId ? 'Update incoming stock entry' : isUrdu ? 'نئی اسٹاک انٹری شامل کریں' : 'Record a new incoming stock entry'}</p>
                </div>
              </div>
              <button
                onClick={() => { setAddStockOpen(false); resetForm(); }}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* ── Entry Type Tabs ── */}
            <div className="shrink-0 border-b border-industrial-100 bg-industrial-50 px-6 py-3 flex items-center gap-4">
              <span className="text-xs font-bold uppercase tracking-wider text-industrial-400">{isUrdu ? 'قسم' : 'Type'}</span>
              <div className="flex gap-1 rounded-xl bg-industrial-200/60 p-1">
                <button
                  type="button"
                  onClick={() => setEntryType('purchase')}
                  className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-semibold transition-all ${
                    entryType === 'purchase'
                      ? 'bg-white text-industrial-900 shadow-sm ring-1 ring-industrial-200'
                      : 'text-industrial-500 hover:text-industrial-700'
                  }`}
                >
                  <Truck className="h-3.5 w-3.5" />
                  {isUrdu ? 'ڈیلر سے خریداری' : 'Purchase from Dealer'}
                </button>
                <button
                  type="button"
                  onClick={() => setEntryType('opening')}
                  className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-semibold transition-all ${
                    entryType === 'opening'
                      ? 'bg-white text-industrial-900 shadow-sm ring-1 ring-industrial-200'
                      : 'text-industrial-500 hover:text-industrial-700'
                  }`}
                >
                  <Package className="h-3.5 w-3.5" />
                  {isUrdu ? 'موجودہ اسٹاک' : 'Existing / Opening Stock'}
                </button>
              </div>
              {entryType === 'opening' && (
                <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 font-medium">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  {isUrdu ? 'کوئی ادائیگی ٹریک نہیں ہوگی' : 'No supplier or payment required'}
                </div>
              )}
            </div>

            {/* ── Scrollable Form Body ── */}
            <form className="flex-1 overflow-y-auto" onSubmit={submit}>
              <div className="grid lg:grid-cols-[1fr_260px] gap-0 h-full">

                {/* Left: form sections */}
                <div className="space-y-0 divide-y divide-industrial-100 border-r border-industrial-100">

                  {/* Section 1: Basic Info */}
                  <div className="p-6">
                    <div className="flex items-center gap-2.5 mb-5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 ring-1 ring-blue-200">
                        <Package className="h-3.5 w-3.5 text-blue-600" />
                      </div>
                      <h3 className="text-sm font-bold text-industrial-800 uppercase tracking-wide">{isUrdu ? 'بنیادی معلومات' : 'Basic Information'}</h3>
                    </div>
                    <div className="grid gap-4 grid-cols-2 xl:grid-cols-3">
                      {entryType === 'purchase' && (
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold uppercase tracking-wide text-industrial-500">{t.supplier}</label>
                          <select
                            value={form.supplier_id}
                            onChange={(e) => setForm({ ...form, supplier_id: Number(e.target.value) })}
                            className="h-10 w-full rounded-lg border-2 border-industrial-200 bg-white px-3 text-sm font-medium text-industrial-900 outline-none transition-all focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20"
                            required
                          >
                            <option value={0}>{t.selectSupplier}</option>
                            {suppliers.map((supplier) => (
                              <option key={supplier.id} value={supplier.id}>{localizeApiText(supplier.name, isUrdu)}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wide text-industrial-500">{t.product}</label>
                        <select
                          value={form.product_id}
                          onChange={(e) => setForm({ ...form, product_id: Number(e.target.value), cement_brand_id: 0 })}
                          className="h-10 w-full rounded-lg border-2 border-industrial-200 bg-white px-3 text-sm font-medium text-industrial-900 outline-none transition-all focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20"
                          required
                        >
                          <option value={0}>{t.selectProduct}</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>{localizeApiText(p.name, isUrdu)}</option>
                          ))}
                        </select>
                      </div>

                      {selectedProduct?.category === 'cement' && (
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold uppercase tracking-wide text-industrial-500">{isUrdu ? 'برانڈ' : 'Brand'}</label>
                          <select
                            value={form.cement_brand_id}
                            onChange={(e) => setForm({ ...form, cement_brand_id: Number(e.target.value) })}
                            className="h-10 w-full rounded-lg border-2 border-industrial-200 bg-white px-3 text-sm font-medium text-industrial-900 outline-none transition-all focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20"
                            required
                          >
                            <option value={0}>{t.selectBrand}</option>
                            {brands.map((brand) => (
                              <option key={brand.id} value={brand.id}>{localizeApiText(brand.brand_name, isUrdu)}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wide text-industrial-500">{t.date}</label>
                        <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required className="h-10" />
                      </div>

                      {entryType === 'purchase' && (<>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold uppercase tracking-wide text-industrial-500">{isUrdu ? 'پک اپ تاریخ' : 'Pickup Date'}</label>
                          <Input type="date" value={form.pickup_date} onChange={(e) => setForm({ ...form, pickup_date: e.target.value })} className="h-10" />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold uppercase tracking-wide text-industrial-500">{isUrdu ? 'ڈیلیوری تاریخ' : 'Delivery Date'}</label>
                          <Input type="date" value={form.delivery_date} onChange={(e) => setForm({ ...form, delivery_date: e.target.value })} className="h-10" />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold uppercase tracking-wide text-industrial-500">{isUrdu ? 'کریڈٹ دن' : 'Credit Days'}</label>
                          <Input
                            type="number" min="0"
                            placeholder={isUrdu ? 'مثلاً: 30' : 'e.g. 30'}
                            value={form.credit_days || ''}
                            onChange={(e) => setForm({ ...form, credit_days: toNumber(e.target.value) })}
                            className="h-10"
                          />
                        </div>

                        <div className="space-y-1.5 col-span-2 xl:col-span-3">
                          <label className="text-xs font-semibold uppercase tracking-wide text-industrial-500">
                            <span className="flex items-center gap-1.5"><MapPin className="h-3 w-3" />{isUrdu ? 'ڈیلیوری لوکیشن' : 'Delivery Location'}</span>
                          </label>
                          <Input
                            placeholder={isUrdu ? 'مثلاً: یارڈ / شاپ / گودام' : 'e.g. yard / shop / godown'}
                            value={form.delivery_location}
                            onChange={(e) => setForm({ ...form, delivery_location: e.target.value })}
                            className="h-10"
                          />
                        </div>
                      </>)}
                    </div>
                  </div>

                  {/* Section 1b: Transport Details */}
                  {entryType === 'purchase' && (
                  <div className="p-6">
                    <div className="flex items-center gap-2.5 mb-5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50 ring-1 ring-orange-200">
                        <Truck className="h-3.5 w-3.5 text-orange-600" />
                      </div>
                      <h3 className="text-sm font-bold text-industrial-800 uppercase tracking-wide">{isUrdu ? 'ٹرانسپورٹ تفصیلات' : 'Transport Details'}</h3>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wide text-industrial-500">{isUrdu ? 'ٹرانسپورٹ معلومات' : 'Transport Info'}</label>
                      <Input
                        placeholder={isUrdu ? 'مثلاً: بلٹی نمبر، ڈرائیور، گاڑی نمبر' : 'e.g. Builty no., driver name, vehicle no. — write anything'}
                        value={form.transport_details}
                        onChange={(e) => setForm({ ...form, transport_details: e.target.value })}
                        className="h-10"
                      />
                    </div>
                  </div>
                  )}

                  {/* Section 2: Quantity & Payment */}
                  <div className="p-6">
                    <div className="flex items-center gap-2.5 mb-5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-50 ring-1 ring-green-200">
                        <span className="text-[10px] font-black text-green-700">PKR</span>
                      </div>
                      <h3 className="text-sm font-bold text-industrial-800 uppercase tracking-wide">
                        {entryType === 'opening' ? (isUrdu ? 'مقدار' : 'Quantity') : (isUrdu ? 'مقدار اور ادائیگی' : 'Quantity & Payment')}
                      </h3>
                    </div>
                    <div className="grid gap-4 grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wide text-industrial-500">{t.quantityWeight}</label>
                        <Input
                          type="number" step="0.01" min="0" placeholder="0.00"
                          value={form.quantity_received || ''}
                          onChange={(e) => setForm({ ...form, quantity_received: toNumber(e.target.value) })}
                          required className="h-10 text-base font-semibold"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wide text-industrial-500">
                          {entryType === 'opening' ? (isUrdu ? 'فی یونٹ قیمت' : 'Price / Unit (optional)') : t.purchasePrice}
                        </label>
                        <Input
                          type="number" step="0.01" min="0" placeholder="0.00"
                          value={form.purchase_price_per_unit || ''}
                          onChange={(e) => setForm({ ...form, purchase_price_per_unit: toNumber(e.target.value) })}
                          required={entryType === 'purchase'} className="h-10 text-base font-semibold"
                        />
                      </div>
                      {entryType === 'purchase' && (<>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold uppercase tracking-wide text-industrial-500">{t.amountPaidNow}</label>
                          <Input
                            type="number" step="0.01" min="0" placeholder="0.00"
                            value={form.amount_paid_to_mill || ''}
                            onChange={(e) => setForm({ ...form, amount_paid_to_mill: toNumber(e.target.value) })}
                            className="h-10 text-base font-semibold"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold uppercase tracking-wide text-industrial-500">{isUrdu ? 'واپس وصول شدہ' : 'Amount Received Back'}</label>
                          <Input
                            type="number" step="0.01" min="0" placeholder="0.00"
                            value={form.amount_received_from_mill || ''}
                            onChange={(e) => setForm({ ...form, amount_received_from_mill: toNumber(e.target.value) })}
                            className="h-10 text-base font-semibold"
                          />
                        </div>
                      </>)}
                      <div className="space-y-1.5 col-span-2">
                        <label className="text-xs font-semibold uppercase tracking-wide text-industrial-500">{t.notes}</label>
                        <Input
                          placeholder={isUrdu ? 'کوئی اضافی نوٹس' : 'Any additional notes'}
                          value={form.notes}
                          onChange={(e) => setForm({ ...form, notes: e.target.value })}
                          className="h-10"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer actions */}
                  <div className="flex justify-end gap-3 px-6 py-4 bg-industrial-50">
                    <Button type="button" variant="outline" onClick={() => { setAddStockOpen(false); resetForm(); }} className="px-6">
                      {isUrdu ? 'منسوخ' : 'Cancel'}
                    </Button>
                    <Button type="submit" size="lg" className="px-8 gap-2 shadow-md" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>{isUrdu ? 'محفوظ ہو رہا ہے...' : 'Saving...'}</>
                      ) : (
                        <><Plus className="h-4 w-4" />{editingInventoryId ? 'Save Changes' : t.addStock}</>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Right: Live Summary sidebar */}
                <div className="bg-industrial-50/80 p-5 flex flex-col gap-3 overflow-y-auto">
                  <div className="flex items-center gap-2 mb-1">
                    <ChevronRight className="h-4 w-4 text-accent-primary" />
                    <span className="text-xs font-bold uppercase tracking-wider text-accent-primary">{isUrdu ? 'خلاصہ' : 'Live Summary'}</span>
                  </div>

                  {/* Total Cost */}
                  <div className="rounded-xl bg-white border-l-4 border-industrial-700 shadow-sm px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-industrial-400 mb-1">{t.totalCost}</p>
                    <p className="text-2xl font-extrabold text-industrial-900 tabular-nums">{fmtCurrency(totalCost)}</p>
                    {totalCost > 0 && (
                      <p className="text-[10px] text-industrial-400 mt-0.5">
                        {form.quantity_received} × {fmtCurrency(form.purchase_price_per_unit)}
                      </p>
                    )}
                  </div>

                  {entryType === 'purchase' && (<>
                    {/* Paid */}
                    <div className="rounded-xl bg-white border-l-4 border-green-500 shadow-sm px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-green-500 mb-1">{t.amountPaid}</p>
                      <p className="text-xl font-extrabold text-green-700 tabular-nums">{fmtCurrency(netPaidToMill)}</p>
                    </div>

                    {/* Pending */}
                    <div className={`rounded-xl bg-white border-l-4 shadow-sm px-4 py-3 ${pendingToMill > 0 ? 'border-red-500' : 'border-green-400'}`}>
                      <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${pendingToMill > 0 ? 'text-red-500' : 'text-green-500'}`}>{t.amountPending}</p>
                      <p className={`text-xl font-extrabold tabular-nums ${pendingToMill > 0 ? 'text-red-600' : 'text-green-600'}`}>{fmtCurrency(pendingToMill)}</p>
                    </div>

                    {/* Overpayment - only show if > 0 */}
                    {overpaymentAmount > 0 && (
                      <div className="rounded-xl bg-amber-50 border-l-4 border-amber-500 shadow-sm px-4 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 mb-1">{isUrdu ? 'اوور پیمنٹ' : 'Overpayment'}</p>
                        <p className="text-xl font-extrabold text-amber-700 tabular-nums">{fmtCurrency(overpaymentAmount)}</p>
                      </div>
                    )}

                    {/* Status badge */}
                    <div className="rounded-xl bg-white border border-industrial-100 shadow-sm px-4 py-3 flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-industrial-400">{t.status}</p>
                      <Badge value={paymentStatus} />
                    </div>

                    {/* Credit due date */}
                    {form.credit_days > 0 && (
                      <div className="rounded-xl bg-blue-50 border-l-4 border-blue-400 shadow-sm px-4 py-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Clock className="h-3 w-3 text-blue-500" />
                          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500">{isUrdu ? 'ادائیگی کی آخری تاریخ' : 'Payment Due'}</p>
                        </div>
                        <p className="text-sm font-bold text-blue-800">
                          {new Date(new Date(form.date || Date.now()).getTime() + form.credit_days * 86400000)
                            .toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                        <p className="text-[10px] text-blue-500 mt-0.5">{isUrdu ? `${form.credit_days} دن بعد` : `In ${form.credit_days} days`}</p>
                      </div>
                    )}
                  </>)}

                  {entryType === 'opening' && (
                    <div className="rounded-xl bg-amber-50 border-l-4 border-amber-400 shadow-sm px-4 py-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <BadgeCheck className="h-3.5 w-3.5 text-amber-600" />
                        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">{isUrdu ? 'اوپننگ اسٹاک' : 'Opening Stock'}</p>
                      </div>
                      <p className="text-xs text-amber-700">{isUrdu ? 'کوئی ادائیگی ٹریک نہیں ہوگی' : 'Stock added directly. No payment tracking.'}</p>
                    </div>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Two-panel layout ── */}
      <div className="flex gap-4 flex-1 min-h-0">

        {/* ── Left: Current Stock ── */}
        <div className="w-[540px] xl:w-[620px] shrink-0 flex flex-col rounded-xl border-2 border-industrial-200 bg-white overflow-hidden">
          <div className="flex items-center border-b border-industrial-200 bg-industrial-50 px-2 py-2 shrink-0 overflow-x-auto scrollbar-none gap-2" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-secondary/15">
                <Package className="h-4 w-4 text-accent-secondary" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-industrial-900">{t.currentStockLevel}</h2>
                <p className="text-[11px] text-industrial-500">{isUrdu ? 'لائیو مقداریں' : 'Live quantities'}</p>
              </div>
            </div>
            <button
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${stockCategory === 'all' ? 'bg-industrial-700 text-white' : 'bg-industrial-100 text-industrial-700 hover:bg-industrial-200'}`}
              onClick={() => setStockCategory('all')}
            >
              {isUrdu ? 'تمام' : 'All'}
            </button>
            <button
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${stockCategory === 'cement' ? 'bg-orange-600 text-white' : 'bg-industrial-100 text-industrial-700 hover:bg-industrial-200'}`}
              onClick={() => setStockCategory('cement')}
            >
              {isUrdu ? 'سیمنٹ' : 'Cement'}
            </button>
            <button
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${stockCategory === 'steel' ? 'bg-blue-700 text-white' : 'bg-industrial-100 text-industrial-700 hover:bg-industrial-200'}`}
              onClick={() => setStockCategory('steel')}
            >
              {isUrdu ? 'سٹیل' : 'Steel'}
            </button>
            <div className="relative w-36 flex-shrink-0">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-industrial-400" />
              <Input value={stockQuery} onChange={(e) => setStockQuery(e.target.value)} placeholder={isUrdu ? 'تلاش...' : 'Search...'} className="pl-8 h-8 text-xs" />
            </div>
            <div className="ml-auto flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-1.5">
              <span className="text-[11px] font-black text-green-800">PKR</span>
              <span className="text-[11px] font-bold uppercase tracking-wide text-green-700">{isUrdu ? 'مالیت' : 'Value'}</span>
              <span className="text-xs font-black text-green-900 tabular-nums">{fmtCurrency(filteredStockValue)}</span>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {paginatedStock.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                <Package className="mb-2 h-10 w-10 text-industrial-300" />
                <p className="text-sm font-semibold text-industrial-500">{isUrdu ? 'کوئی اسٹاک نہیں' : 'No stock found'}</p>
              </div>
            ) : (
              <table className="w-full min-w-[600px] text-sm">
                <thead className="sticky top-0 bg-industrial-800 text-white z-10">
                  <tr>
                    <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider w-44">{t.product}</th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider w-24">{t.typeBrand}</th>
                    <th className="px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wider w-20">{t.stock}</th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider w-16">{t.unit}</th>
                    <th className="px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wider w-28">{isUrdu ? 'فی یونٹ' : 'Unit Price'}</th>
                    <th className="px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wider w-32">{isUrdu ? 'کل مالیت' : 'Total Value'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-industrial-100">
                  {paginatedStock.map((row, index) => {
                    const unitPrice = getStockUnitPrice(row);
                    const stockQty = Number(row.stock || 0);
                    const exactStockValue = unitPrice * stockQty;
                    return (
                    <tr key={`${row.product_id}-${row.cement_brand_id ?? 0}`} className={`transition-colors hover:bg-accent-primary/5 ${index % 2 !== 0 ? 'bg-industrial-50/40' : 'bg-white'}`}>
                      <td className="px-3 py-3 align-top">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-primary/10">
                            <Package className="h-3.5 w-3.5 text-accent-primary" />
                          </div>
                          <span className="font-semibold text-industrial-900 text-xs leading-tight">{localizeApiText(row.product?.name, isUrdu)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 align-top text-industrial-500 text-xs">{localizeApiText(row.cement_brand?.brand_name || row.product?.type, isUrdu)}</td>
                      <td className="px-3 py-3 align-top text-right">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-bold ${
                          row.stock < 0 ? 'bg-red-100 text-red-700' : 'bg-accent-primary/10 text-accent-primary'
                        }`}>{row.stock}</span>
                      </td>
                      <td className="px-3 py-3 align-top text-industrial-500 text-xs">{localizeApiUnit(row.product?.unit, isUrdu)}</td>
                      <td className="px-3 py-3 align-top text-right font-semibold text-blue-700 text-xs whitespace-nowrap">
                        {fmtCurrency(unitPrice)}
                      </td>
                      <td className="px-3 py-3 align-top text-right whitespace-nowrap">
                        <div className="font-bold text-industrial-900 text-xs">{fmtCurrency(exactStockValue)}</div>
                        <div className="mt-0.5 text-[10px] text-industrial-400">
                          {stockQty.toLocaleString()} × {fmtCurrency(unitPrice)}
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="shrink-0">
            <PaginationBar currentPage={stockPage} totalPages={stockTotalPages} pageSize={stockPageSize} totalRows={filteredStock.length} onPageChange={setStockPage} onPageSizeChange={setStockPageSize} isUrdu={isUrdu} />
          </div>
        </div>

        {/* ── Right: Stock History ── */}
        <div className="flex-1 flex flex-col rounded-xl border-2 border-industrial-200 bg-white overflow-hidden min-w-0">
          <div className="flex items-center border-b border-industrial-200 bg-industrial-50 px-2 py-2 shrink-0 overflow-x-auto scrollbar-none gap-2" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-primary/10">
                <Calendar className="h-4 w-4 text-accent-primary" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-industrial-900">{t.stockHistory}</h2>
                <p className="text-[11px] text-industrial-500">{isUrdu ? 'تمام اسٹاک اندراجات' : 'All stock entries'}</p>
              </div>
            </div>
            <button
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${stockCategory === 'all' ? 'bg-industrial-700 text-white' : 'bg-industrial-100 text-industrial-700 hover:bg-industrial-200'}`}
              onClick={() => setStockCategory('all')}
            >
              {isUrdu ? 'تمام' : 'All'}
            </button>
            <button
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${stockCategory === 'cement' ? 'bg-orange-600 text-white' : 'bg-industrial-100 text-industrial-700 hover:bg-industrial-200'}`}
              onClick={() => setStockCategory('cement')}
            >
              {isUrdu ? 'سیمنٹ' : 'Cement'}
            </button>
            <button
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${stockCategory === 'steel' ? 'bg-blue-700 text-white' : 'bg-industrial-100 text-industrial-700 hover:bg-industrial-200'}`}
              onClick={() => setStockCategory('steel')}
            >
              {isUrdu ? 'سٹیل' : 'Steel'}
            </button>
            <div className="relative w-52 flex-shrink-0">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-industrial-400" />
              <Input value={historyQuery} onChange={(e) => setHistoryQuery(e.target.value)} placeholder={isUrdu ? 'سپلائر، پروڈکٹ تلاش کریں' : 'Search supplier, product...'} className="pl-8 h-8 text-xs" />
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {paginatedHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                <Calendar className="mb-2 h-10 w-10 text-industrial-300" />
                <p className="text-sm font-semibold text-industrial-500">{isUrdu ? 'کوئی ہسٹری نہیں' : 'No history found'}</p>
              </div>
            ) : (
              <table className="w-full text-sm min-w-[1020px]">
                <thead className="sticky top-0 bg-industrial-800 text-white z-10">
                  <tr>
                    <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider w-24">{t.date}</th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider">{t.supplier}</th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider">{t.product}</th>
                    <th className="px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wider">{isUrdu ? 'مقدار' : 'Qty'}</th>
                    <th className="px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wider">{isUrdu ? 'فی یونٹ قیمت' : 'Unit Price'}</th>
                    <th className="px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wider">{t.totalCost}</th>
                    <th className="px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wider">{t.paid}</th>
                    <th className="px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wider bg-red-900/30">{t.pending}</th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider">{t.status}</th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider">{isUrdu ? 'کریڈٹ' : 'Credit Due'}</th>
                    <th className="px-3 py-2.5 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-industrial-100">
                  {paginatedHistory.map((row, index) => (
                    <tr key={row.id} className={`transition-colors hover:bg-accent-primary/5 ${index % 2 !== 0 ? 'bg-industrial-50/40' : 'bg-white'}`}>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="font-semibold text-industrial-900 text-xs">{new Date(row.date).toLocaleDateString(locale)}</div>
                        {row.delivery_location && <div className="text-[10px] text-industrial-400 truncate max-w-[90px]">{row.delivery_location}</div>}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          {row.entry_type === 'opening' ? (
                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                              {isUrdu ? 'اوپننگ اسٹاک' : 'Opening Stock'}
                            </span>
                          ) : (
                            <>
                              <Truck className="h-3 w-3 shrink-0 text-industrial-400" />
                              <div>
                                <span className="font-medium text-industrial-900 text-xs">{localizeApiText(row.supplier?.name, isUrdu)}</span>
                                {row.transport_details && <div className="text-[10px] text-orange-500 truncate max-w-[120px]">{row.transport_details}</div>}
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-medium text-industrial-900 text-xs">
                        {localizeApiText(row.product?.name, isUrdu)}
                        {row.cement_brand?.brand_name && <div className="text-[10px] text-industrial-400">{localizeApiText(row.cement_brand.brand_name, isUrdu)}</div>}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-industrial-900 text-xs whitespace-nowrap">
                        {row.quantity_received}
                        <div className="text-[10px] text-industrial-400 font-normal">{localizeApiUnit(row.product?.unit, isUrdu)}</div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-blue-700 text-xs whitespace-nowrap">{fmtCurrency(row.purchase_price_per_unit)}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-industrial-900 text-xs whitespace-nowrap">{fmtCurrency(row.total_cost)}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-accent-primary text-xs whitespace-nowrap">{fmtCurrency(row.amount_paid_to_mill)}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-accent-danger text-xs whitespace-nowrap">{fmtCurrency(row.amount_pending_to_mill)}</td>
                      <td className="px-3 py-2.5"><Badge value={row.payment_status} /></td>
                      <td className="px-3 py-2.5 text-xs">
                        {row.credit_days > 0 ? (
                          <div>
                            <div className="font-semibold text-blue-700 whitespace-nowrap">
                              {new Date(new Date(row.date).getTime() + row.credit_days * 86400000)
                                .toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                            <div className="text-[10px] text-industrial-400">{isUrdu ? `${row.credit_days} دن` : `${row.credit_days}d`}</div>
                          </div>
                        ) : <span className="text-industrial-300">—</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <button type="button" onClick={() => openEditStock(row)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                            title="Edit Stock Entry">
                            <Pencil size={14} />
                          </button>
                          <button type="button" onClick={() => deleteInventory(row.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="shrink-0">
            <PaginationBar currentPage={historyPage} totalPages={historyTotalPages} pageSize={historyPageSize} totalRows={filteredHistory.length} onPageChange={setHistoryPage} onPageSizeChange={setHistoryPageSize} isUrdu={isUrdu} />
          </div>
        </div>

      </div>

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
              <p className="text-industrial-600">{isUrdu ? 'یہ اندراج مستقل طور پر حذف ہو جائے گا۔' : 'This inventory entry will be removed permanently.'}</p>
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

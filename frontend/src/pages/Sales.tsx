import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, BadgeCheck, CalendarDays, ChevronRight, Clock, FileDown, History, MessageCircle, Package, Plus, Printer, Search, ShoppingBag, ShoppingCart, Trash2, User, X } from 'lucide-react';
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
import { downloadSaleReceiptPdf } from '../lib/pdfExports';

type DraftItem = {
  product_id: number;
  cement_brand_id?: number;
  quantity: number;
  sale_price_per_unit: number;
  total: number;
};

const sel = "h-11 w-full rounded-lg border-2 border-industrial-300 bg-white px-4 text-sm font-medium focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 focus:outline-none appearance-none cursor-pointer";
const PAGE_SIZE_OPTIONS = [10, 20, 30, 50];

function HistoryPagination({
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
      <p className="text-sm text-industrial-600">{isUrdu ? `کل ${totalRows} ریکارڈز` : `Total ${totalRows} records`}</p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-industrial-500">{isUrdu ? 'فی صفحہ' : 'Rows'}</label>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="h-9 rounded-lg border-2 border-industrial-300 bg-white px-3 text-sm font-medium"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
        <Button type="button" variant="outline" size="sm" onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
          {isUrdu ? 'پچھلا' : 'Prev'}
        </Button>
        <div className="rounded-lg border border-industrial-300 bg-white px-3 py-1.5 text-sm font-semibold text-industrial-700">
          {isUrdu ? `${currentPage} / ${Math.max(1, totalPages)}` : `Page ${currentPage} of ${Math.max(1, totalPages)}`}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages}>
          {isUrdu ? 'اگلا' : 'Next'}
        </Button>
      </div>
    </div>
  );
}

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
    isCredit: false, credit_days: 0, due_date: '', amount_paid: 0, loading_charges: 0, discount: 0, notes: '',
  });
  // Customer state
  const [selectedCustomerId, setSelectedCustomerId] = useState<number>(0);
  const [customerSearch, setCustomerSearch] = useState('');
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [walkInName, setWalkInName] = useState('');
  const filteredCustomers = customers.filter(c =>
    c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone?.includes(customerSearch)
  );
  const [items, setItems] = useState<DraftItem[]>([]);
  const [savedMsg, setSavedMsg] = useState('');
  const [lastSaleReceipt, setLastSaleReceipt] = useState<ReceiptData | null>(null);
  const [validationError, setValidationError] = useState('');
  const [historyQuery, setHistoryQuery] = useState('');
  const [historyStatus, setHistoryStatus] = useState<'all' | 'paid' | 'partial' | 'pending' | 'overdue'>('all');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);
  const [newSaleOpen, setNewSaleOpen] = useState(false);

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

  const grandTotal = useMemo(() => items.reduce((s, i) => s + i.total, 0) + Number(sale.loading_charges || 0) - Number(sale.discount || 0), [items, sale.loading_charges, sale.discount]);
  const pending = Math.max(0, grandTotal - Number(sale.amount_paid || 0));
  const status = pending === 0 ? 'paid' : sale.amount_paid > 0 ? 'partial' : 'pending';

  const filteredSales = useMemo(() => {
    return allSales.filter((s: any) => {
      const custName = String(s.customer?.name || s.customer_name || '').toLowerCase();
      const phone = String(s.customer?.phone || s.customer_phone || '').toLowerCase();
      const invoice = String(s.id);
      const search = historyQuery.trim().toLowerCase();
      const searchMatch = !search || custName.includes(search) || phone.includes(search) || invoice.includes(search);

      const effectiveStatus = s.is_overdue ? 'overdue' : s.status;
      const statusMatch = historyStatus === 'all' ? true : effectiveStatus === historyStatus;
      return searchMatch && statusMatch;
    });
  }, [allSales, historyQuery, historyStatus]);

  const historyTotals = useMemo(() => {
    return filteredSales.reduce(
      (acc: { total: number; paid: number; pending: number }, s: any) => {
        acc.total += Number(s.total_amount || 0);
        acc.paid += Number(s.paid_amount || 0);
        acc.pending += Number(s.pending_amount || 0);
        return acc;
      },
      { total: 0, paid: 0, pending: 0 },
    );
  }, [filteredSales]);

  const allSalesTotals = useMemo(() => allSales.reduce(
    (acc: { total: number; paid: number; pending: number }, s: any) => {
      acc.total += Number(s.total_amount || 0);
      acc.paid += Number(s.paid_amount || 0);
      acc.pending += Number(s.pending_amount || 0);
      return acc;
    },
    { total: 0, paid: 0, pending: 0 },
  ), [allSales]);

  const historyTotalPages = Math.max(1, Math.ceil(filteredSales.length / historyPageSize));
  const paginatedSales = useMemo(() => {
    const start = (historyPage - 1) * historyPageSize;
    return filteredSales.slice(start, start + historyPageSize);
  }, [filteredSales, historyPage, historyPageSize]);

  useEffect(() => {
    setHistoryPage(1);
  }, [historyQuery, historyStatus, historyPageSize]);

  useEffect(() => {
    if (historyPage > historyTotalPages) {
      setHistoryPage(historyTotalPages);
    }
  }, [historyPage, historyTotalPages]);

  const submitSale = async () => {
    setValidationError('');
    if (!items.length) { setValidationError('Please add at least one item.'); return; }
    if (sale.isCredit && !sale.credit_days) { setValidationError('Credit sale requires Credit Days to be set (e.g. 30 days).'); return; }
    if (!isWalkIn && !selectedCustomerId) { setValidationError('Please select a customer or use Walk-in / Cash Customer.'); return; }

    const resp = await api.post('/sales', {
      date: sale.date,
      due_date: sale.isCredit ? sale.due_date || undefined : undefined,
      credit_days: sale.isCredit ? Number(sale.credit_days || 0) : undefined,
      paid_amount: Number(sale.amount_paid || 0),
      loading_charges: Number(sale.loading_charges || 0),
      discount: Number(sale.discount || 0),
      notes: sale.notes,
      customer_id: isWalkIn ? undefined : selectedCustomerId,
      customer_name: isWalkIn ? (walkInName.trim() || 'Walk-in Customer') : undefined,
      items: items.map((i) => ({
        product_id: i.product_id, cement_brand_id: i.cement_brand_id,
        quantity: Number(i.quantity), sale_price_per_unit: Number(i.sale_price_per_unit),
      })),
    });

    // Build receipt data for printing
    const savedSale = resp.data;
    const selectedCustomer = isWalkIn ? null : customers.find(c => c.id === selectedCustomerId);
    const customerName = isWalkIn ? (walkInName.trim() || 'Walk-in Customer') : (selectedCustomer?.name || 'Customer');
    const customerPhone = selectedCustomer?.phone;
    const customerAddress = selectedCustomer?.address;

    const itemsSubtotal = items.reduce((s, i) => s + Number(i.total), 0);
    const lc = Number(sale.loading_charges || 0);
    const disc = Number(sale.discount || 0);
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
      loadingCharges: lc || undefined,
      discount: disc || undefined,
      totalAmount: itemsSubtotal + lc - disc,
      paidAmount: Number(sale.amount_paid || 0),
      pendingAmount: Math.max(0, itemsSubtotal + lc - disc - Number(sale.amount_paid || 0)),
      paymentType: sale.isCredit ? 'credit' : 'cash',
      dueDate: sale.due_date || undefined,
      creditDays: sale.credit_days || undefined,
      notes: sale.notes,
    };
    setLastSaleReceipt(receiptData);
    setItems([]);
    setSale({ date: new Date().toISOString().slice(0, 10), isCredit: false, credit_days: 0, due_date: '', amount_paid: 0, loading_charges: 0, discount: 0, notes: '' });
    setSelectedCustomerId(0); setCustomerSearch(''); setIsWalkIn(false); setWalkInName('');
    setSavedMsg(t.completeSale + ' ✓');
    setTimeout(() => { setSavedMsg(''); setLastSaleReceipt(null); }, 30000);
    setNewSaleOpen(false);
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
        loadingCharges: Number(s.loading_charges) > 0 ? Number(s.loading_charges) : undefined,
        paidAmount: Number(s.paid_amount),
        pendingAmount: Number(s.pending_amount),
        paymentType: Number(s.pending_amount) > 0 ? 'credit' : 'cash',
        dueDate: s.due_date || undefined,
        creditDays: s.credit_days || undefined,
        notes: s.notes,
      };
      printReceipt(receipt);
    } catch (err) {
      console.error('Failed to print receipt:', err);
    }
  };

  const downloadExistingSalePdf = async (saleId: number) => {
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
        loadingCharges: Number(s.loading_charges) > 0 ? Number(s.loading_charges) : undefined,
        paidAmount: Number(s.paid_amount),
        pendingAmount: Number(s.pending_amount),
        paymentType: Number(s.pending_amount) > 0 ? 'credit' : 'cash',
        dueDate: s.due_date || undefined,
        creditDays: s.credit_days || undefined,
        notes: s.notes,
      };
      downloadSaleReceiptPdf(receipt);
    } catch (err) {
      console.error('Failed to download invoice PDF:', err);
    }
  };

  const shareOnWhatsApp = (receipt: ReceiptData, phone?: string) => {
    const date = new Date(receipt.date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
    const itemLines = receipt.items.map(i => {
      const itemName = i.brand ? `${i.name} (${i.brand})` : i.name;
      return `  • ${itemName}: ${i.quantity} ${i.unit} × Rs.${i.rate.toLocaleString()} = Rs.${i.total.toLocaleString()}`;
    }).join('\n');

    let msg = `*Haji Kala Khan Son's*\n`;
    msg += `Receipt #${receipt.saleId} | ${date}\n`;
    msg += `Customer: ${receipt.customerName}\n`;
    msg += `─────────────────────\n`;
    msg += `${itemLines}\n`;
    msg += `─────────────────────\n`;
    if (receipt.loadingCharges) msg += `Loading: Rs.${receipt.loadingCharges.toLocaleString()}\n`;
    if (receipt.discount) msg += `Discount: -Rs.${receipt.discount.toLocaleString()}\n`;
    msg += `*Total: Rs.${receipt.totalAmount.toLocaleString()}*\n`;
    msg += `Paid: Rs.${receipt.paidAmount.toLocaleString()}\n`;
    if (receipt.pendingAmount > 0) msg += `*Balance Due: Rs.${receipt.pendingAmount.toLocaleString()}*\n`;
    if (receipt.dueDate && receipt.pendingAmount > 0) {
      const due = new Date(receipt.dueDate);
      const today = new Date(); today.setHours(0,0,0,0);
      const dueDateStr = due.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
      msg += due < today ? `⚠ OVERDUE — Due: ${dueDateStr}\n` : `Due Date: ${dueDateStr}\n`;
    }
    msg += `─────────────────────\n`;
    msg += receipt.paymentType === 'cash' ? '✓ Cash Paid' : '★ Credit / ادھار';
    if (receipt.notes) msg += `\nNote: ${receipt.notes}`;
    msg += `\n\nDeveloped by Upedge Technologies | 03412041065`;

    const encoded = encodeURIComponent(msg);
    // Normalize Pakistani phone number to international format
    let waPhone = '';
    if (phone) {
      const digits = phone.replace(/\D/g, '');
      waPhone = digits.startsWith('92') ? digits : digits.startsWith('0') ? '92' + digits.slice(1) : '92' + digits;
    }
    const url = waPhone
      ? `https://web.whatsapp.com/send?phone=${waPhone}&text=${encoded}`
      : `https://web.whatsapp.com/send?text=${encoded}`;
    window.open(url, '_blank');
  };

  const shareExistingSaleOnWhatsApp = async (saleId: number) => {
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
        loadingCharges: Number(s.loading_charges) > 0 ? Number(s.loading_charges) : undefined,
        paidAmount: Number(s.paid_amount),
        pendingAmount: Number(s.pending_amount),
        paymentType: Number(s.pending_amount) > 0 ? 'credit' : 'cash',
        dueDate: s.due_date || undefined,
        creditDays: s.credit_days || undefined,
        notes: s.notes,
      };
      shareOnWhatsApp(receipt, s.customer?.phone || s.customer_phone);
    } catch (err) {
      console.error('Failed to share receipt:', err);
    }
  };

  const sc: any = { paid: 'bg-green-100 text-green-800 border border-green-200', partial: 'bg-accent-secondary/10 text-accent-secondary border border-accent-secondary/20', pending: 'bg-industrial-100 text-industrial-700 border border-industrial-300', overdue: 'bg-accent-danger/10 text-accent-danger border border-accent-danger/20' };

  return (
    <div className={`flex flex-col h-[calc(100vh-9rem)] gap-3 ${isUrdu ? 'font-urdu' : ''}`}>
      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-industrial-900">{isUrdu ? 'سیلز مینجمنٹ' : 'Sales Management'}</h1>
          <p className="text-xs text-industrial-500">{isUrdu ? 'نئی سیل درج کریں اور مکمل تاریخ دیکھیں' : 'Create sales and view complete history'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-lg border border-industrial-200 bg-white px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-industrial-500">{isUrdu ? 'کل سیلز' : 'Total Sales'}</p>
            <p className="text-sm font-bold text-industrial-900">{allSales.length}</p>
          </div>
          <div className="rounded-lg border border-industrial-200 bg-white px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-industrial-500">{isUrdu ? 'کل مالیت' : 'Total Value'}</p>
            <p className="text-sm font-bold text-industrial-900">{fmtCurrency(allSalesTotals.total)}</p>
          </div>
          <div className="rounded-lg border border-industrial-200 bg-white px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-industrial-500">{isUrdu ? 'بقایا' : 'Outstanding'}</p>
            <p className="text-sm font-bold text-accent-danger">{fmtCurrency(allSalesTotals.pending)}</p>
          </div>
          <Button onClick={() => setNewSaleOpen(true)} className="h-9">
            <Plus className="h-4 w-4 mr-1.5" />{isUrdu ? 'نئی سیل' : 'New Sale'}
          </Button>
        </div>
      </div>

      {/* ── Success Banner ── */}
      {savedMsg && (
        <div className="shrink-0 flex items-center justify-between rounded-xl bg-green-50 border-2 border-green-200 px-4 py-3">
          <span className="text-sm font-semibold text-green-800">{savedMsg}</span>
          {lastSaleReceipt && (
            <div className="flex items-center gap-2">
              <button onClick={() => shareOnWhatsApp(lastSaleReceipt, lastSaleReceipt.customerPhone)}
                className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
                <MessageCircle className="h-3.5 w-3.5" />{isUrdu ? 'واٹس ایپ' : 'WhatsApp'}
              </button>
              <button onClick={() => downloadSaleReceiptPdf(lastSaleReceipt)}
                className="flex items-center gap-2 bg-accent-primary hover:bg-accent-primary/90 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
                <FileDown className="h-3.5 w-3.5" />{isUrdu ? 'پی ڈی ایف' : 'Download PDF'}
              </button>
              <button onClick={() => printReceipt(lastSaleReceipt)}
                className="flex items-center gap-2 bg-industrial-800 hover:bg-industrial-900 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
                <Printer className="h-3.5 w-3.5" />{isUrdu ? 'پرنٹ' : 'Print Receipt'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Sales History Panel ── */}
      <div className="flex-1 flex flex-col rounded-xl border-2 border-industrial-200 bg-white overflow-hidden min-h-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-industrial-200 bg-industrial-50 px-4 py-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-secondary/15">
              <History className="h-4 w-4 text-accent-secondary" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-industrial-900">{t.saleHistory}</h2>
              <p className="text-[11px] text-industrial-500">
                {filteredSales.length !== allSales.length
                  ? `${filteredSales.length} of ${allSales.length} ${isUrdu ? 'سیلز' : 'sales'}`
                  : `${allSales.length} ${isUrdu ? 'سیلز' : 'sales'}`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-industrial-400" />
              <Input value={historyQuery} onChange={(e) => setHistoryQuery(e.target.value)}
                placeholder={isUrdu ? 'کسٹمر، فون...' : 'Customer, phone, invoice...'}
                className="pl-8 h-8 text-xs w-52" />
            </div>
            <select value={historyStatus} onChange={(e) => setHistoryStatus(e.target.value as any)}
              className="h-8 rounded-lg border-2 border-industrial-300 bg-white px-3 text-xs font-medium outline-none focus:border-accent-primary">
              <option value="all">{isUrdu ? 'تمام' : 'All Status'}</option>
              <option value="paid">{t.paid}</option>
              <option value="partial">{t.partial}</option>
              <option value="pending">{t.pending}</option>
              <option value="overdue">{t.overdue}</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {paginatedSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8 text-center">
              <History className="mb-2 h-10 w-10 text-industrial-300" />
              <p className="text-sm font-semibold text-industrial-500">{isUrdu ? 'کوئی سیل نہیں ملی' : 'No sales found'}</p>
            </div>
          ) : (
            <table className="w-full text-sm min-w-[820px]">
              <thead className="sticky top-0 bg-industrial-800 text-white z-10">
                <tr>
                  <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider w-20">{isUrdu ? 'انوائس' : 'Invoice'}</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider">{t.customer}</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Items</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider w-24">{t.date}</th>
                  <th className="px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wider">{isUrdu ? 'کل' : 'Total'}</th>
                  <th className="px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wider">{t.paid}</th>
                  <th className="px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wider bg-red-900/30">{t.pending}</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider">{t.status}</th>
                  <th className="px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wider">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-industrial-100">
                {paginatedSales.map((s: any, idx: number) => {
                  const custName = s.customer?.name || s.customer_name || null;
                  const effectiveStatus = s.is_overdue ? 'overdue' : s.status;
                  return (
                    <tr key={s.id} className={`transition-colors hover:bg-accent-primary/5 ${idx % 2 !== 0 ? 'bg-industrial-50/40' : 'bg-white'}`}>
                      <td className="px-3 py-2.5">
                        <div className="font-bold text-industrial-900 text-xs">#{s.id}</div>
                        <div className="text-[10px] text-industrial-400">
                          {Number(s.pending_amount || 0) > 0 ? (isUrdu ? 'اُدھار' : 'Credit') : (isUrdu ? 'کیش' : 'Cash')}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <User className="h-3 w-3 shrink-0 text-industrial-400" />
                          <div>
                            <div className="font-semibold text-industrial-900 text-xs">{custName ? localizeApiText(custName, isUrdu) : (isUrdu ? 'واک اِن' : 'Walk-in')}</div>
                            <div className="text-[10px] text-industrial-400">{s.customer?.phone || s.customer_phone || ''}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-col gap-0.5">
                          {s.items && s.items.length > 0 ? s.items.map((item: any, i: number) => {
                            const name = item.product?.name || 'Item';
                            const brand = item.cement_brand?.brand_name;
                            const label = brand ? `${name} (${brand})` : name;
                            return (
                              <div key={i} className="text-xs text-industrial-800">
                                <span className="font-semibold">{label}</span>
                                <span className="text-industrial-500"> · {Number(item.quantity).toLocaleString()} {item.product?.unit || ''}</span>
                              </div>
                            );
                          }) : <span className="text-industrial-300 text-xs">—</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="text-xs font-medium text-industrial-800 whitespace-nowrap">{new Date(s.date).toLocaleDateString(locale)}</div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-industrial-900 text-xs whitespace-nowrap">{fmtCurrency(s.total_amount)}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-accent-primary text-xs whitespace-nowrap">{fmtCurrency(s.paid_amount || 0)}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-accent-danger text-xs whitespace-nowrap">{fmtCurrency(s.pending_amount || 0)}</td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${sc[effectiveStatus]}`}>
                          {effectiveStatus === 'overdue' ? t.overdue : effectiveStatus === 'paid' ? t.paid : effectiveStatus === 'partial' ? t.partial : t.pending}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => shareExistingSaleOnWhatsApp(s.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-green-600 hover:bg-green-50 hover:text-green-700 transition-colors"
                            title="Share on WhatsApp">
                            <MessageCircle size={13} />
                          </button>
                          <button onClick={() => printExistingSale(s.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-industrial-500 hover:bg-industrial-100 hover:text-industrial-800 transition-colors"
                            title="Print Receipt">
                            <Printer size={13} />
                          </button>
                          <button onClick={() => downloadExistingSalePdf(s.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-industrial-500 hover:bg-industrial-100 hover:text-industrial-800 transition-colors"
                            title="Download PDF">
                            <FileDown size={13} />
                          </button>
                          <AttachmentManager entityType="sale" entityId={s.id} label={`Sale #${s.id}`} />
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
          <HistoryPagination currentPage={historyPage} totalPages={historyTotalPages} pageSize={historyPageSize}
            totalRows={filteredSales.length} onPageChange={setHistoryPage} onPageSizeChange={setHistoryPageSize} isUrdu={isUrdu} />
        </div>
      </div>

      {/* ── New Sale Modal ── */}
      {newSaleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 overflow-hidden">

            {/* ── Header ── */}
            <div className="shrink-0 bg-gradient-to-r from-green-700 to-green-900 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
                  <ShoppingCart className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{t.newSale}</h2>
                  <p className="text-xs text-green-200 mt-0.5">{isUrdu ? 'نئی فروخت درج کریں' : 'Record a new sale transaction'}</p>
                </div>
              </div>
              <button onClick={() => setNewSaleOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* ── Body: two-column layout ── */}
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-0">

              {/* Left: form */}
              <div className="flex-1 overflow-y-auto divide-y divide-industrial-100">

                {/* Section 1: Customer */}
                <div className="p-6">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 ring-1 ring-blue-200">
                      <User className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-industrial-700">{isUrdu ? 'کسٹمر' : 'Select Customer'}</h3>
                  </div>

                  {/* Walk-in toggle */}
                  <div className="mb-3 flex gap-2">
                    <button type="button"
                      onClick={() => { setIsWalkIn(false); setWalkInName(''); }}
                      className={`flex-1 rounded-lg border-2 px-3 py-2 text-xs font-semibold transition-all ${!isWalkIn ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-industrial-200 text-industrial-500 hover:border-industrial-300'}`}>
                      <User className="inline h-3 w-3 mr-1" />{isUrdu ? 'موجودہ کسٹمر' : 'Existing Customer'}
                    </button>
                    <button type="button"
                      onClick={() => { setIsWalkIn(true); setSelectedCustomerId(0); setCustomerSearch(''); }}
                      className={`flex-1 rounded-lg border-2 px-3 py-2 text-xs font-semibold transition-all ${isWalkIn ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-industrial-200 text-industrial-500 hover:border-industrial-300'}`}>
                      🧍 {isUrdu ? 'واک اِن / نقد' : 'Walk-in / Cash'}
                    </button>
                  </div>

                  {isWalkIn ? (
                    <div className="rounded-xl bg-amber-50 border-2 border-amber-200 px-4 py-3">
                      <p className="text-xs font-semibold text-amber-700 mb-2">{isUrdu ? 'نقد / واک اِن کسٹمر' : 'Cash / Walk-in Customer'}</p>
                      <input
                        className="h-9 w-full rounded-lg border-2 border-amber-300 bg-white px-3 text-sm focus:border-amber-500 focus:outline-none"
                        placeholder={isUrdu ? 'نام (اختیاری)' : 'Customer name (optional)'}
                        value={walkInName} onChange={e => setWalkInName(e.target.value)} />
                    </div>
                  ) : selectedCustomerId > 0 ? (
                    <div className="flex items-center justify-between rounded-xl bg-blue-50 border-2 border-blue-200 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-blue-200 flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-blue-800">{customers.find(c => c.id === selectedCustomerId)?.name?.charAt(0)?.toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="font-bold text-blue-900 text-sm">{customers.find(c => c.id === selectedCustomerId)?.name}</p>
                          <p className="text-xs text-blue-500">{customers.find(c => c.id === selectedCustomerId)?.phone || 'No phone'}</p>
                        </div>
                      </div>
                      <button onClick={() => { setSelectedCustomerId(0); setCustomerSearch(''); }}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-blue-400 hover:bg-blue-100 transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-industrial-400" />
                        <input
                          className="h-10 w-full rounded-lg border-2 border-industrial-200 bg-white pl-9 pr-4 text-sm focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20"
                          placeholder={isUrdu ? 'نام یا فون سے تلاش کریں...' : 'Search by name or phone...'}
                          value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} />
                      </div>
                      <div className="max-h-32 overflow-y-auto rounded-xl border-2 border-industrial-200 divide-y divide-industrial-100 bg-white">
                        {filteredCustomers.length === 0
                          ? <p className="px-4 py-3 text-xs text-center text-industrial-400">{isUrdu ? 'کوئی کسٹمر نہیں ملا' : 'No customers found'}</p>
                          : filteredCustomers.slice(0, 20).map(c => (
                            <button key={c.id} onClick={() => { setSelectedCustomerId(c.id); setCustomerSearch(c.name); }}
                              className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-industrial-50 transition-colors">
                              <div>
                                <p className="font-semibold text-industrial-900 text-sm">{c.name}</p>
                                <p className="text-[11px] text-industrial-400">{c.phone || c.address || ''}</p>
                              </div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.type === 'regular' ? 'bg-blue-100 text-blue-700' : c.type === 'contractor' ? 'bg-purple-100 text-purple-700' : 'bg-industrial-100 text-industrial-600'}`}>
                                {c.type || 'customer'}
                              </span>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 2: Payment Type + Date */}
                <div className="p-6">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-50 ring-1 ring-green-200">
                      <BadgeCheck className="h-3.5 w-3.5 text-green-600" />
                    </div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-industrial-700">{isUrdu ? 'ادائیگی کی قسم' : 'Payment Type'}</h3>
                  </div>

                  <div className="flex gap-2 mb-4">
                    <div className="flex gap-1 rounded-xl bg-industrial-100/80 p-1">
                      <button type="button" onClick={() => setSale({ ...sale, isCredit: false, credit_days: 0, due_date: '' })}
                        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${!sale.isCredit ? 'bg-green-600 text-white shadow-sm' : 'text-industrial-500 hover:text-industrial-700'}`}>
                        💵 {isUrdu ? 'نقد' : 'Cash'}
                      </button>
                      <button type="button" onClick={() => setSale({ ...sale, isCredit: true })}
                        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${sale.isCredit ? 'bg-amber-500 text-white shadow-sm' : 'text-industrial-500 hover:text-industrial-700'}`}>
                        📋 {isUrdu ? 'اُدھار' : 'Udhar / Credit'}
                      </button>
                    </div>
                    <div className="space-y-0">
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-industrial-400 block mb-1">
                        <CalendarDays className="inline h-3 w-3 mr-1" />{t.date}
                      </label>
                      <input type="date" value={sale.date} onChange={e => setSale({ ...sale, date: e.target.value })}
                        className="h-10 rounded-lg border-2 border-industrial-200 px-3 text-sm font-medium focus:border-accent-primary focus:outline-none" />
                    </div>
                  </div>

                  {sale.isCredit && (
                    <div className="flex flex-wrap items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block mb-1">{isUrdu ? 'کریڈٹ دن' : 'Credit Days'} <span className="text-red-500">*</span></label>
                        <Input type="number" className="w-28 h-9" placeholder="e.g. 30" value={sale.credit_days || ''} onChange={(e) => {
                          const days = Number(e.target.value || 0);
                          const dueDate = days ? new Date(new Date(sale.date).getTime() + days * 86400000).toISOString().slice(0, 10) : '';
                          setSale({ ...sale, credit_days: days, due_date: dueDate });
                        }} />
                      </div>
                      {sale.due_date ? (
                        <div className="rounded-lg bg-white border border-amber-200 px-3 py-2">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <Clock className="h-3 w-3 text-amber-600" />
                            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">{isUrdu ? 'آخری تاریخ' : 'Due Date'}</p>
                          </div>
                          <p className="text-sm font-bold text-amber-800">{new Date(sale.due_date).toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-200 px-3 py-2 self-end">
                          <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                          <span className="text-xs font-semibold text-red-600">{isUrdu ? 'کریڈٹ دن درج کریں' : 'Enter credit days'}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Section 3: Add Item */}
                <div className="p-6">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 ring-1 ring-purple-200">
                      <Package className="h-3.5 w-3.5 text-purple-600" />
                    </div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-industrial-700">{isUrdu ? 'آئٹم شامل کریں' : 'Add Item'}</h3>
                  </div>

                  <div className="space-y-3 mb-4">
                    {/* Row 1: Product + Brand (or empty) */}
                    <div className="grid gap-3 grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-industrial-500">{t.selectProduct}</label>
                        <select
                          className="h-10 w-full rounded-lg border-2 border-industrial-200 bg-white px-3 text-sm font-medium text-industrial-900 focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 focus:outline-none appearance-none"
                          value={draft.product_id} onChange={(e) => setDraft({ ...draft, product_id: Number(e.target.value) })}>
                          <option value={0}>{t.selectProduct}</option>
                          {products.map((p) => <option key={p.id} value={p.id}>{localizeApiText(p.name, isUrdu)}</option>)}
                        </select>
                      </div>
                      {selected?.category === 'cement' ? (
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold uppercase tracking-wider text-industrial-500">{t.selectBrand}</label>
                          <select
                            className="h-10 w-full rounded-lg border-2 border-industrial-200 bg-white px-3 text-sm font-medium text-industrial-900 focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 focus:outline-none appearance-none"
                            value={draft.cement_brand_id || 0} onChange={(e) => setDraft({ ...draft, cement_brand_id: Number(e.target.value) })}>
                            <option value={0}>{t.selectBrand}</option>
                            {brands.map((b) => <option key={b.id} value={b.id}>{localizeApiText(b.brand_name, isUrdu)}</option>)}
                          </select>
                        </div>
                      ) : <div />}
                    </div>
                    {/* Row 2: Qty + Price */}
                    <div className="grid gap-3 grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-industrial-500">
                          {isWeightBased ? `${isUrdu ? 'وزن' : 'Weight'} (${selected?.unit})` : t.quantity}
                        </label>
                        <Input type="number" className="h-10 text-sm font-semibold" placeholder="0"
                          value={draft.quantity || ''} onChange={(e) => setDraft({ ...draft, quantity: Number(e.target.value) })} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-industrial-500">
                          {isWeightBased ? `${isUrdu ? 'قیمت' : 'Price'} / ${selected?.unit}` : t.price}
                        </label>
                        <Input type="number" className="h-10 text-sm font-semibold" placeholder="0"
                          value={draft.sale_price_per_unit || ''} onChange={(e) => setDraft({ ...draft, sale_price_per_unit: Number(e.target.value) })} />
                      </div>
                    </div>
                  </div>

                  <button type="button" onClick={addItem}
                    className="flex items-center gap-2 rounded-lg border-2 border-dashed border-industrial-300 bg-industrial-50 px-4 py-2 text-sm font-semibold text-industrial-600 hover:border-accent-primary hover:bg-accent-primary/5 hover:text-accent-primary transition-all">
                    <Plus className="h-4 w-4" />{isUrdu ? 'آئٹم شامل کریں' : '+ Add Item'}
                  </button>

                  {/* Items list */}
                  {items.length > 0 && (
                    <div className="mt-3 overflow-auto rounded-xl border-2 border-industrial-200">
                      <table className="w-full text-xs">
                        <thead className="bg-industrial-800 text-white">
                          <tr>
                            <th className="px-3 py-2 text-left font-bold uppercase tracking-wider">{t.product}</th>
                            <th className="px-3 py-2 text-right font-bold uppercase tracking-wider">{t.quantity}</th>
                            <th className="px-3 py-2 text-right font-bold uppercase tracking-wider">{t.price}</th>
                            <th className="px-3 py-2 text-right font-bold uppercase tracking-wider">{t.total}</th>
                            <th className="px-3 py-2 w-8" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-industrial-100">
                          {items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-industrial-50">
                              <td className="px-3 py-2 font-semibold text-industrial-900">
                                {localizeApiText(products.find((p) => p.id === item.product_id)?.name, isUrdu)}
                                {item.cement_brand_id && <span className="text-industrial-400 ml-1">({localizeApiText(brands.find(b => b.id === item.cement_brand_id)?.brand_name, isUrdu)})</span>}
                              </td>
                              <td className="px-3 py-2 text-right text-industrial-700">{item.quantity}</td>
                              <td className="px-3 py-2 text-right text-industrial-700">{fmtCurrency(item.sale_price_per_unit)}</td>
                              <td className="px-3 py-2 text-right font-bold text-green-700">{fmtCurrency(item.total)}</td>
                              <td className="px-3 py-2 text-center">
                                <button onClick={() => setItems(items.filter((_, i) => i !== idx))}
                                  className="text-red-400 hover:text-red-600 transition-colors">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Notes */}
                  <div className="mt-4">
                    <label className="text-xs font-semibold uppercase tracking-wider text-industrial-500 block mb-1.5">{t.notes}</label>
                    <Input placeholder={isUrdu ? 'کوئی نوٹ...' : 'Any notes (optional)'}
                      value={sale.notes} onChange={(e) => setSale({ ...sale, notes: e.target.value })} className="h-10 text-sm" />
                  </div>
                </div>

                {/* Validation error */}
                {validationError && (
                  <div className="mx-6 mb-5 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-2.5">
                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                    <p className="text-xs font-semibold text-red-600">{validationError}</p>
                  </div>
                )}
              </div>

              {/* Right: Live Summary + Actions */}
              <div className="lg:w-72 shrink-0 bg-industrial-50/80 border-t lg:border-t-0 lg:border-l border-industrial-100 flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-green-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-green-700">{isUrdu ? 'خلاصہ' : 'Live Summary'}</span>
                  </div>

                  {/* Grand Total */}
                  <div className="rounded-xl bg-white border-l-4 border-industrial-700 shadow-sm px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-industrial-400 mb-1">{isUrdu ? 'کل رقم' : 'Grand Total'}</p>
                    <p className="text-2xl font-extrabold text-industrial-900 tabular-nums">{fmtCurrency(grandTotal)}</p>
                    {items.length > 0 && (
                      <p className="text-[10px] text-industrial-400 mt-0.5">{items.length} {isUrdu ? 'آئٹمز' : 'items'}</p>
                    )}
                  </div>

                  {/* Loading Charges */}
                  <div className="rounded-xl bg-white border border-industrial-100 shadow-sm px-4 py-3">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-industrial-400 block mb-1.5">{isUrdu ? 'لوڈنگ چارجز' : 'Loading Charges'}</label>
                    <Input type="number" placeholder="0" className="h-8 text-sm font-semibold"
                      value={sale.loading_charges || ''} onChange={(e) => setSale({ ...sale, loading_charges: Number(e.target.value) })} />
                    {Number(sale.loading_charges) > 0 && (
                      <p className="text-[10px] text-industrial-400 mt-1">
                        {fmtCurrency(items.reduce((s,i)=>s+i.total,0))} + {fmtCurrency(Number(sale.loading_charges))}
                      </p>
                    )}
                  </div>

                  {/* Discount */}
                  <div className="rounded-xl bg-white border border-red-100 shadow-sm px-4 py-3">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-red-400 block mb-1.5">{isUrdu ? 'چھوٹ / رعایت' : 'Discount'}</label>
                    <Input type="number" placeholder="0" className="h-8 text-sm font-semibold text-red-600"
                      value={sale.discount || ''} onChange={(e) => setSale({ ...sale, discount: Number(e.target.value) })} />
                    {Number(sale.discount) > 0 && (
                      <p className="text-[10px] text-red-400 mt-1">- {fmtCurrency(Number(sale.discount))} {isUrdu ? 'کٹوتی' : 'off'}</p>
                    )}
                  </div>

                  {/* Amount Paid */}
                  <div className="rounded-xl bg-white border-l-4 border-green-500 shadow-sm px-4 py-3">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-green-500 block mb-1.5">
                      {sale.isCredit ? (isUrdu ? 'پیشگی' : 'Advance / Partial') : (isUrdu ? 'وصول شدہ' : 'Amount Paid')}
                    </label>
                    <Input type="number" className="h-8 text-sm font-bold" placeholder="0"
                      value={sale.amount_paid || ''} onChange={(e) => setSale({ ...sale, amount_paid: Number(e.target.value) })} />
                  </div>

                  {/* Pending */}
                  <div className={`rounded-xl bg-white border-l-4 shadow-sm px-4 py-3 ${pending > 0 ? 'border-red-500' : 'border-green-400'}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${pending > 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {sale.isCredit ? (isUrdu ? 'کریڈٹ بقایا' : 'Credit Balance') : (isUrdu ? 'باقی رقم' : 'Remaining')}
                    </p>
                    <p className={`text-xl font-extrabold tabular-nums ${pending > 0 ? 'text-red-600' : 'text-green-600'}`}>{fmtCurrency(pending)}</p>
                  </div>

                  {/* Status */}
                  <div className="rounded-xl bg-white border border-industrial-100 shadow-sm px-4 py-3 flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-industrial-400">{isUrdu ? 'حالت' : 'Status'}</p>
                    <span className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${sc[status]}`}>
                      {status === 'paid' ? (isUrdu ? 'ادا' : 'Paid') : status === 'partial' ? (isUrdu ? 'جزوی' : 'Partial') : (isUrdu ? 'باقی' : 'Pending')}
                    </span>
                  </div>

                  {/* Credit due date reminder */}
                  {sale.isCredit && pending > 0 && sale.due_date && (
                    <div className="rounded-xl bg-amber-50 border-l-4 border-amber-400 shadow-sm px-4 py-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Clock className="h-3 w-3 text-amber-600" />
                        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">{isUrdu ? 'آخری تاریخ' : 'Due Date'}</p>
                      </div>
                      <p className="text-xs font-bold text-amber-800">{new Date(sale.due_date).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    </div>
                  )}

                  {/* Cash pending warning */}
                  {!sale.isCredit && pending > 0 && items.length > 0 && (
                    <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 flex items-start gap-2">
                      <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-[10px] font-semibold text-red-600">{isUrdu ? 'مکمل رقم درج کریں یا اُدھار آن کریں' : 'Enter full amount or switch to Credit'}</p>
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="shrink-0 border-t border-industrial-100 p-4 space-y-2 bg-white">
                  <button type="button" onClick={submitSale}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-600 hover:bg-green-700 active:scale-[0.98] text-white font-bold py-2.5 text-sm transition-all shadow-md disabled:opacity-50"
                    disabled={items.length === 0}>
                    <ShoppingBag className="h-4 w-4" />{t.completeSale}
                  </button>
                  <button type="button" onClick={() => setNewSaleOpen(false)}
                    className="w-full rounded-xl border-2 border-industrial-200 bg-white text-industrial-600 hover:bg-industrial-50 font-semibold py-2 text-sm transition-colors">
                    {isUrdu ? 'منسوخ' : 'Cancel'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

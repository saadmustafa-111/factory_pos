import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronDown, ChevronUp, Eye, EyeOff, Phone, MapPin, ExternalLink } from 'lucide-react';
import { api } from '../lib/api';
import { useLang } from '../lib/i18n';
import { fmtCurrency } from '../lib/utils';

interface UdharSale {
  sale_id: number;
  sale_date: string;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  sale_status: string;
  due_date: string | null;
  items_summary: string;
}

interface UdharCustomer {
  customer_id: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  total_pending: number;
  sales: UdharSale[];
}

export default function UdharBook() {
  const { t, isUrdu } = useLang();
  const navigate = useNavigate();
  const [amtsHidden, setAmtsHidden] = useState(() => localStorage.getItem('udhar-hidden') === 'true');
  const toggleAmts = (v: boolean) => { setAmtsHidden(v); localStorage.setItem('udhar-hidden', String(v)); };
  const H = (val: number) => amtsHidden ? '••••••' : fmtCurrency(val);
  const [data, setData] = useState<UdharCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get<UdharCustomer[]>('/customers/udhar-book');
        setData(res.data);
        // Auto-expand first 3
        setExpanded(new Set(res.data.slice(0, 3).map((c) => c.customer_id)));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const toggle = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filtered = data.filter(
    (c) =>
      !search ||
      c.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      (c.customer_phone && c.customer_phone.includes(search)),
  );

  const totalOutstanding = data.reduce((s, c) => s + c.total_pending, 0);
  const today = new Date().toISOString().split('T')[0];

  const isOverdue = (sale: UdharSale) =>
    sale.due_date && sale.due_date < today && sale.sale_status !== 'paid';

  return (
    <div className={`flex flex-col h-[calc(100vh-9rem)] gap-3 ${isUrdu ? 'font-urdu' : ''}`}>

      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-industrial-900">{isUrdu ? 'اُدھار بُک' : 'Udhar Book'}</h1>
          <p className="text-xs text-industrial-500">
            {isUrdu ? 'تمام قرضدار گاہک — سب سے زیادہ باقی رقم پہلے' : 'All credit customers — sorted by highest outstanding first'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-lg border border-industrial-200 bg-white px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-industrial-500">{isUrdu ? 'کل گاہک' : 'Customers'}</p>
            <p className="text-sm font-bold text-industrial-900">{filtered.length}</p>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-red-500">{isUrdu ? 'کل واجب الادا' : 'Total Outstanding'}</p>
            <p className="text-sm font-bold text-red-700">{H(totalOutstanding)}</p>
          </div>
          <div className="relative">
            <svg className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-industrial-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={isUrdu ? 'نام یا فون...' : 'Search by name or phone...'}
              className="pl-8 h-8 w-52 rounded-lg border-2 border-industrial-300 bg-white text-xs font-medium focus:border-accent-primary focus:outline-none" />
          </div>
          <button
            onClick={() => toggleAmts(!amtsHidden)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500 transition-colors h-8"
          >
            {amtsHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            {amtsHidden ? 'Show Amounts' : 'Hide Amounts'}
          </button>
        </div>
      </div>

      {/* ── Customer Table Panel ── */}
      <div className="flex-1 flex flex-col rounded-xl border-2 border-industrial-200 bg-white overflow-hidden min-h-0">
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-24 text-industrial-400 text-sm">{t.loading}</div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-24 text-industrial-400 text-sm">
              {isUrdu ? 'کوئی اُدھار باقی نہیں' : 'No outstanding credit'}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-industrial-800 text-white z-10">
                <tr>
                  <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider w-10">#</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider">{isUrdu ? 'گاہک' : 'Customer'}</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider">{isUrdu ? 'رابطہ' : 'Contact'}</th>
                  <th className="px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wider text-red-300">{isUrdu ? 'کل واجب الادا' : 'Outstanding'}</th>
                  <th className="px-3 py-2.5 text-center text-xs font-bold uppercase tracking-wider w-24">{isUrdu ? 'فروخت' : 'Sales'}</th>
                  <th className="px-3 py-2.5 text-center text-xs font-bold uppercase tracking-wider w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((customer, rank) => {
                  const isOpen = expanded.has(customer.customer_id);
                  const overdueCount = customer.sales.filter(isOverdue).length;
                  return (
                    <>
                      <tr
                        key={customer.customer_id}
                        onClick={() => toggle(customer.customer_id)}
                        className={`cursor-pointer border-b border-industrial-100 hover:bg-accent-primary/5 transition-colors ${rank % 2 !== 0 ? 'bg-industrial-50/40' : 'bg-white'} ${isOpen ? 'bg-accent-primary/5' : ''}`}
                      >
                        <td className="px-3 py-2.5">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                            ${rank === 0 ? 'bg-red-100 text-red-700' : rank === 1 ? 'bg-orange-100 text-orange-700' : rank === 2 ? 'bg-yellow-100 text-yellow-700' : 'bg-industrial-100 text-industrial-600'}`}>
                            {rank + 1}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-industrial-900">{customer.customer_name}</span>
                            {overdueCount > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                                <AlertTriangle className="h-2.5 w-2.5" />
                                {overdueCount} {isUrdu ? 'میعاد گزری' : 'overdue'}
                              </span>
                            )}
                          </div>
                          {customer.customer_address && (
                            <div className="flex items-center gap-1 mt-0.5 text-[10px] text-industrial-400">
                              <MapPin className="h-2.5 w-2.5" />{customer.customer_address}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-industrial-600">
                          {customer.customer_phone ? (
                            <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{customer.customer_phone}</span>
                          ) : <span className="text-industrial-300">—</span>}
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold text-red-600">{H(customer.total_pending)}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="text-xs text-industrial-500">{customer.sales.length} {isUrdu ? 'باقی' : 'pending'}</span>
                        </td>
                        <td className="px-3 py-2.5 text-center text-industrial-400">
                          {isOpen ? <ChevronUp className="h-4 w-4 mx-auto" /> : <ChevronDown className="h-4 w-4 mx-auto" />}
                        </td>
                      </tr>

                      {/* Expanded detail rows */}
                      {isOpen && (
                        <tr key={`${customer.customer_id}-detail`}>
                          <td colSpan={6} className="p-0 border-b-2 border-industrial-200">
                            {/* Detail sub-header */}
                            <div className="flex items-center justify-between bg-industrial-700 px-4 py-2">
                              <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider">
                                {isUrdu ? 'ادھار فروخت کی تفصیل' : 'Pending Sale Details'}
                              </span>
                              <button
                                onClick={(e) => { e.stopPropagation(); navigate(`/customers/${customer.customer_id}`); }}
                                className="flex items-center gap-1 text-xs text-white/80 hover:text-white font-medium"
                              >
                                <ExternalLink className="h-3 w-3" />
                                {isUrdu ? 'مکمل پروفائل' : 'View Full Profile'}
                              </button>
                            </div>
                            {/* Detail column headers */}
                            <div className="grid grid-cols-12 gap-2 px-4 py-1.5 bg-industrial-100 text-[10px] font-bold uppercase tracking-wider text-industrial-500">
                              <div className="col-span-2">{isUrdu ? 'تاریخ' : 'Date'}</div>
                              <div className="col-span-5">{isUrdu ? 'اشیاء' : 'Items'}</div>
                              <div className="col-span-3 text-right">{isUrdu ? 'رقم' : 'Amount'}</div>
                              <div className="col-span-2 text-right">{isUrdu ? 'حالت' : 'Status'}</div>
                            </div>
                            {/* Sale rows */}
                            <div className="divide-y divide-industrial-100">
                              {customer.sales.map((sale) => {
                                const overdue = isOverdue(sale);
                                return (
                                  <div key={sale.sale_id}
                                    className={`px-4 py-2.5 grid grid-cols-12 gap-2 items-start text-xs ${overdue ? 'bg-red-50/60' : 'bg-white'}`}>
                                    <div className="col-span-2 text-industrial-500">
                                      <div className="font-medium">{new Date(sale.sale_date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                                      {sale.due_date && (
                                        <div className={`mt-0.5 ${overdue ? 'text-red-600 font-semibold' : 'text-industrial-400'}`}>
                                          {isUrdu ? 'واجب:' : 'Due:'} {new Date(sale.due_date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short' })}
                                        </div>
                                      )}
                                    </div>
                                    <div className="col-span-5 text-industrial-700 font-medium">
                                      {sale.items_summary || (isUrdu ? '—' : 'No items')}
                                    </div>
                                    <div className="col-span-3 text-right space-y-0.5">
                                      <div className="text-industrial-400">{isUrdu ? 'کل' : 'Total'}: {H(sale.total_amount)}</div>
                                      <div className="text-green-600">{isUrdu ? 'ادا' : 'Paid'}: {H(sale.paid_amount)}</div>
                                      <div className="font-bold text-red-600">{isUrdu ? 'باقی' : 'Due'}: {H(sale.pending_amount)}</div>
                                    </div>
                                    <div className="col-span-2 text-right">
                                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        overdue ? 'bg-red-100 text-red-700' : sale.sale_status === 'partial' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                                      }`}>
                                        {overdue ? (isUrdu ? 'میعاد گزری' : 'Overdue') : sale.sale_status === 'partial' ? (isUrdu ? 'جزوی' : 'Partial') : (isUrdu ? 'باقی' : 'Pending')}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            {/* Total footer */}
                            <div className="px-4 py-2.5 bg-industrial-50 flex justify-between items-center">
                              <span className="text-xs text-industrial-600 font-medium">
                                {isUrdu ? `${customer.customer_name} کا کل واجب الادا` : `Total Outstanding for ${customer.customer_name}`}
                              </span>
                              <span className="text-sm font-bold text-red-600">{H(customer.total_pending)}</span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

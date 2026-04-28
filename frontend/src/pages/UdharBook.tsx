import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronDown, ChevronUp, User, Phone, MapPin, ExternalLink } from 'lucide-react';
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
    <div className={`space-y-6 ${isUrdu ? 'font-urdu' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-industrial-900">
            {isUrdu ? 'اُدھار بُک' : 'Udhar Book'}
          </h1>
          <p className="text-sm text-industrial-500 mt-1">
            {isUrdu
              ? 'تمام قرضدار گاہک — سب سے زیادہ باقی رقم پہلے'
              : 'All credit customers — sorted by highest outstanding first'}
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg px-5 py-3 text-right">
          <div className="text-xs text-red-600 font-medium">
            {isUrdu ? 'کل واجب الادا' : 'Total Outstanding'}
          </div>
          <div className="text-xl font-bold text-red-700">{fmtCurrency(totalOutstanding)}</div>
          <div className="text-xs text-industrial-500">{filtered.length} {isUrdu ? 'گاہک' : 'customers'}</div>
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={isUrdu ? 'نام یا فون سے تلاش کریں...' : 'Search by name or phone...'}
        className="h-11 w-full max-w-sm rounded-xl border-2 border-industrial-300 bg-white px-4 text-sm font-medium focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 focus:outline-none"
      />

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-industrial-400">{t.loading}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-industrial-400">
          {isUrdu ? 'کوئی اُدھار باقی نہیں' : 'No outstanding credit'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((customer, rank) => {
            const isOpen = expanded.has(customer.customer_id);
            const overdueCount = customer.sales.filter(isOverdue).length;

            return (
              <div
                key={customer.customer_id}
                className="bg-white rounded-xl shadow-industrial border border-industrial-200 overflow-hidden"
              >
                {/* Customer Header Row */}
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-industrial-50 transition-colors"
                  onClick={() => toggle(customer.customer_id)}
                >
                  {/* Rank Badge */}
                  <div
                    className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold
                      ${rank === 0 ? 'bg-red-100 text-red-700' : rank === 1 ? 'bg-orange-100 text-orange-700' : rank === 2 ? 'bg-yellow-100 text-yellow-700' : 'bg-industrial-100 text-industrial-600'}`}
                  >
                    #{rank + 1}
                  </div>

                  {/* Customer Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-industrial-900">{customer.customer_name}</span>
                      {overdueCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                          <AlertTriangle className="h-3 w-3" />
                          {overdueCount} {isUrdu ? 'میعاد گزری' : 'overdue'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-industrial-500">
                      {customer.customer_phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {customer.customer_phone}
                        </span>
                      )}
                      {customer.customer_address && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {customer.customer_address}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Outstanding Amount */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-lg font-bold text-red-600">
                      {fmtCurrency(customer.total_pending)}
                    </div>
                    <div className="text-xs text-industrial-500">
                      {customer.sales.length} {isUrdu ? 'خریداریاں باقی' : 'pending sales'}
                    </div>
                  </div>

                  {/* Expand/Collapse */}
                  <div className="flex-shrink-0 text-industrial-400">
                    {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </div>
                </div>

                {/* Sales Detail (Expanded) */}
                {isOpen && (
                  <div className="border-t border-industrial-200">
                    <div className="px-5 py-3 bg-industrial-50 flex items-center justify-between">
                      <span className="text-xs font-semibold text-industrial-600 uppercase tracking-wide">
                        {isUrdu ? 'ادھار فروخت کی تفصیل' : 'Pending Sale Details'}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/customers/${customer.customer_id}`);
                        }}
                        className="flex items-center gap-1 text-xs text-accent-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {isUrdu ? 'مکمل پروفائل' : 'View Full Profile'}
                      </button>
                    </div>

                    <div className="divide-y divide-industrial-100">
                      {customer.sales.map((sale) => {
                        const overdue = isOverdue(sale);
                        return (
                          <div
                            key={sale.sale_id}
                            className={`px-5 py-3 grid grid-cols-12 gap-3 items-start text-sm ${overdue ? 'bg-red-50' : ''}`}
                          >
                            {/* Date */}
                            <div className="col-span-2 text-industrial-500 text-xs pt-0.5">
                              <div>{new Date(sale.sale_date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                              {sale.due_date && (
                                <div className={`mt-1 ${overdue ? 'text-red-600 font-medium' : 'text-industrial-400'}`}>
                                  {isUrdu ? 'واجب:' : 'Due:'} {new Date(sale.due_date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short' })}
                                </div>
                              )}
                            </div>

                            {/* Items */}
                            <div className="col-span-5 text-industrial-700">
                              <span className="font-medium text-industrial-800">
                                {sale.items_summary || (isUrdu ? '—' : 'No items')}
                              </span>
                            </div>

                            {/* Amounts */}
                            <div className="col-span-3 text-right space-y-0.5">
                              <div className="text-xs text-industrial-400">
                                {isUrdu ? 'کل' : 'Total'}: {fmtCurrency(sale.total_amount)}
                              </div>
                              <div className="text-xs text-green-600">
                                {isUrdu ? 'ادا' : 'Paid'}: {fmtCurrency(sale.paid_amount)}
                              </div>
                              <div className="text-sm font-semibold text-red-600">
                                {isUrdu ? 'باقی' : 'Due'}: {fmtCurrency(sale.pending_amount)}
                              </div>
                            </div>

                            {/* Status Badge */}
                            <div className="col-span-2 text-right">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                  overdue
                                    ? 'bg-red-100 text-red-700'
                                    : sale.sale_status === 'partial'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-blue-100 text-blue-700'
                                }`}
                              >
                                {overdue
                                  ? (isUrdu ? 'میعاد گزری' : 'Overdue')
                                  : sale.sale_status === 'partial'
                                  ? (isUrdu ? 'جزوی' : 'Partial')
                                  : (isUrdu ? 'باقی' : 'Pending')}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Customer Total Footer */}
                    <div className="px-5 py-3 bg-industrial-50 border-t border-industrial-200 flex justify-between items-center">
                      <span className="text-sm text-industrial-600 font-medium">
                        {isUrdu ? 'کل واجب الادا' : 'Total Outstanding for'} {customer.customer_name}
                      </span>
                      <span className="text-base font-bold text-red-600">
                        {fmtCurrency(customer.total_pending)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

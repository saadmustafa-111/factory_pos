import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, AlertCircle, TrendingDown, Banknote, ChevronRight } from 'lucide-react';
import { api } from '../lib/api';
import { useLang } from '../lib/i18n';
import { fmtCurrency } from '../lib/utils';
import { AttachmentManager } from '../components/AttachmentManager';

interface CustomerRow {
  id: number;
  name: string;
  phone: string;
  address: string;
  customer_type: 'cash' | 'credit' | 'installment';
  total_purchased: number;
  total_paid: number;
  remaining_balance: number;
  overdue_amount: number;
  overdue_installments: number;
  last_purchase_date: string | null;
  last_payment_date: string | null;
  next_due_date: string | null;
  next_due_amount: number | null;
  status: 'clear' | 'active' | 'overdue';
}

interface OverdueSummary {
  overdue_customers: number;
  total_overdue: number;
  today_collections: number;
}

const TYPE_COLORS: Record<string, string> = {
  cash: 'bg-green-100 text-green-700',
  credit: 'bg-blue-100 text-blue-700',
  installment: 'bg-purple-100 text-purple-700',
};

const STATUS_COLORS: Record<string, string> = {
  clear: 'bg-industrial-100 text-industrial-500',
  active: 'bg-yellow-100 text-yellow-700',
  overdue: 'bg-red-100 text-red-700',
};

export default function Customers() {
  const { t, isUrdu } = useLang();
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [summary, setSummary] = useState<OverdueSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [listRes, ovdRes] = await Promise.all([
        api.get<CustomerRow[]>(`/customers/ledger-list?type=${typeFilter}&status=${statusFilter}`),
        api.get<OverdueSummary>('/customers/overdue-summary'),
      ]);
      setCustomers(listRes.data);
      setSummary(ovdRes.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [typeFilter, statusFilter]);

  const filtered = customers.filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone && c.phone.includes(search)),
  );

  const totalCustomers = customers.length;
  const totalOutstanding = customers.reduce((s, c) => s + c.remaining_balance, 0);

  const statCards = [
    {
      label: t.totalCustomers,
      value: totalCustomers,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: t.overdueCustomers,
      value: summary?.overdue_customers ?? 0,
      icon: AlertCircle,
      color: 'text-red-500',
      bg: 'bg-red-50',
    },
    {
      label: t.totalOutstanding,
      value: fmtCurrency(totalOutstanding),
      icon: TrendingDown,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
    },
    {
      label: t.todayCollections,
      value: fmtCurrency(summary?.today_collections ?? 0),
      icon: Banknote,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
  ];

  const typeButtons = [
    { key: 'all', label: t.allTypes },
    { key: 'cash', label: t.cashCustomers },
    { key: 'credit', label: t.creditCustomers },
    { key: 'installment', label: t.installmentCustomers },
  ];

  const statusButtons = [
    { key: 'all', label: t.allCustomers },
    { key: 'active', label: t.withBalance },
    { key: 'overdue', label: t.overdueOnly },
  ];

  return (
    <div className={`p-6 space-y-6 ${isUrdu ? 'font-urdu' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-industrial-900">{t.customers}</h1>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`rounded-xl p-4 ${card.bg} border border-industrial-100`}>
              <div className="flex items-center gap-3">
                <div className={`${card.color} rounded-lg bg-white p-2 shadow-sm`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-industrial-500">{card.label}</p>
                  <p className={`text-lg font-bold ${card.color}`}>{card.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Type filter */}
        <div className="flex flex-wrap gap-2">
          {typeButtons.map((btn) => (
            <button
              key={btn.key}
              onClick={() => setTypeFilter(btn.key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                typeFilter === btn.key
                  ? 'bg-industrial-700 text-white'
                  : 'bg-industrial-100 text-industrial-700 hover:bg-industrial-200'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
        {/* Status filter */}
        <div className="flex flex-wrap gap-2">
          {statusButtons.map((btn) => (
            <button
              key={btn.key}
              onClick={() => setStatusFilter(btn.key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === btn.key
                  ? 'bg-accent-primary text-white'
                  : 'bg-industrial-100 text-industrial-700 hover:bg-industrial-200'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
        {/* Search */}
        <input
          type="text"
          placeholder={t.search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-industrial-200 px-4 py-2 text-sm focus:border-industrial-500 focus:outline-none"
        />
      </div>

      {/* Customer list */}
      {loading ? (
        <p className="text-center text-industrial-500 py-10">{t.loading}</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-industrial-400 py-10">{t.noData}</p>
      ) : (
        <div className="rounded-xl border-2 border-industrial-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-industrial-100 border-b-2 border-industrial-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-industrial-700 uppercase tracking-wider">
                    {t.customer}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-industrial-700 uppercase tracking-wider">
                    {t.contact}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-industrial-700 uppercase tracking-wider">
                    {t.customerType}
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-industrial-700 uppercase tracking-wider">
                    {t.balance}
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-industrial-700 uppercase tracking-wider">
                    {t.overdueAmt}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-industrial-700 uppercase tracking-wider">
                    {t.status}
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-industrial-700 uppercase tracking-wider">
                    {t.action}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-industrial-200">
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-industrial-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/customers/${c.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-industrial-900">{c.name}</p>
                        {c.last_purchase_date && (
                          <p className="text-xs text-industrial-500 mt-0.5">
                            {t.lastPurchase}: {c.last_purchase_date}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        {c.phone ? (
                          <p className="text-industrial-700">{c.phone}</p>
                        ) : (
                          <p className="text-industrial-400 italic">No phone</p>
                        )}
                        {c.address && (
                          <p className="text-xs text-industrial-500 mt-0.5">{c.address}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${TYPE_COLORS[c.customer_type]}`}>
                        {c.customer_type === 'cash' ? t.cashType : c.customer_type === 'credit' ? t.creditType : t.installmentType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {c.remaining_balance > 0 ? (
                        <span className="font-bold text-yellow-700">{fmtCurrency(c.remaining_balance)}</span>
                      ) : (
                        <span className="text-industrial-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {c.overdue_amount > 0 ? (
                        <div>
                          <p className="font-bold text-red-600">{fmtCurrency(c.overdue_amount)}</p>
                          {c.overdue_installments > 0 && (
                            <p className="text-xs text-red-500 mt-0.5">{c.overdue_installments} due(s)</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-industrial-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[c.status]}`}>
                          {c.status === 'overdue' ? t.overdueOnly : c.status === 'active' ? t.withBalance : 'Clear'}
                        </span>
                        {c.next_due_date && (
                          <p className="text-xs text-industrial-600">
                            Next: {c.next_due_date}
                            {c.next_due_amount != null && <> ({fmtCurrency(c.next_due_amount)})</>}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span onClick={(e) => e.stopPropagation()}>
                          <AttachmentManager
                            entityType="customer"
                            entityId={c.id}
                            label={c.name}
                          />
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/customers/${c.id}`);
                          }}
                          className="inline-flex items-center justify-center rounded-lg bg-accent-primary text-white px-4 py-2 text-xs font-semibold hover:bg-accent-primary/90 transition-colors"
                        >
                          View Details
                          <ChevronRight className="h-3 w-3 ml-1" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

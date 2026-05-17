import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, TrendingDown, Banknote, ChevronRight, Car, CreditCard, Eye, EyeOff, Users as UsersIcon, Plus } from 'lucide-react';
import { api } from '../lib/api';
import { useLang } from '../lib/i18n';
import { fmtCurrency } from '../lib/utils';
import { AttachmentManager } from '../components/AttachmentManager';
import { CustomerFormModal } from '../components/CustomerFormModal';

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
  sales_pending: number;
  status: 'clear' | 'active' | 'overdue';
  // New fields
  vehicle_number?: string;
  cnic?: string;
  relation_with_me?: string;
  image_url?: string;
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
  const [amtsHidden, setAmtsHidden] = useState(() => localStorage.getItem('customers-hidden') === 'true');
  const toggleAmts = (v: boolean) => { setAmtsHidden(v); localStorage.setItem('customers-hidden', String(v)); };
  const H = (val: number) => amtsHidden ? '••••••' : fmtCurrency(val);

  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [summary, setSummary] = useState<OverdueSummary | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);

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
      label: t.totalOutstanding,
      value: H(totalOutstanding),
      icon: TrendingDown,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
    },
    {
      label: t.todayCollections,
      value: H(summary?.today_collections ?? 0),
      icon: Banknote,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
  ];

  const typeButtons = [
    { key: 'all', label: t.allTypes },
    { key: 'cash', label: t.cashCustomers },
    { key: 'credit', label: t.creditCustomers },
  ];

  const statusButtons = [
    { key: 'all', label: t.allCustomers },
    { key: 'active', label: t.withBalance },
  ];

  return (
    <div className={`flex flex-col h-[calc(100vh-9rem)] gap-3 ${isUrdu ? 'font-urdu' : ''}`}>

      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-industrial-900">{t.customers}</h1>
          <p className="text-xs text-industrial-500">{isUrdu ? 'تمام کسٹمرز اور ان کی بیلنس کا جائزہ' : 'Manage customers and view outstanding balances'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="rounded-lg border border-industrial-200 bg-white px-3 py-2 flex items-center gap-2">
                <Icon className={`h-3.5 w-3.5 ${card.color}`} />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-industrial-500">{card.label}</p>
                  <p className={`text-sm font-bold ${card.color}`}>{card.value}</p>
                </div>
              </div>
            );
          })}
          <button
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-accent-primary px-4 py-2 text-sm font-bold text-white hover:bg-accent-primary/90 transition-colors h-9"
          >
            <Plus className="h-4 w-4" />
            {isUrdu ? 'کسٹمر شامل کریں' : 'Add Customer'}
          </button>
          <button
            onClick={() => toggleAmts(!amtsHidden)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500 transition-colors h-9"
          >
            {amtsHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            {amtsHidden ? 'Show Amounts' : 'Hide Amounts'}
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {typeButtons.map((btn) => (
          <button key={btn.key} onClick={() => setTypeFilter(btn.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              typeFilter === btn.key ? 'bg-industrial-700 text-white' : 'bg-industrial-100 text-industrial-700 hover:bg-industrial-200'
            }`}>
            {btn.label}
          </button>
        ))}
        <div className="w-px h-5 bg-industrial-300" />
        {statusButtons.map((btn) => (
          <button key={btn.key} onClick={() => setStatusFilter(btn.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              statusFilter === btn.key ? 'bg-accent-primary text-white' : 'bg-industrial-100 text-industrial-700 hover:bg-industrial-200'
            }`}>
            {btn.label}
          </button>
        ))}
        <div className="w-px h-5 bg-industrial-300" />
        <div className="relative">
          <svg className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-industrial-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input type="text" placeholder={t.search} value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 w-52 rounded-lg border-2 border-industrial-300 bg-white text-xs font-medium focus:border-accent-primary focus:outline-none" />
        </div>
        {filtered.length !== customers.length && (
          <span className="text-xs text-industrial-500">{filtered.length} of {customers.length}</span>
        )}
      </div>

      {/* ── Customers Table Panel ── */}
      <div className="flex-1 flex flex-col rounded-xl border-2 border-industrial-200 bg-white overflow-hidden min-h-0">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-industrial-500">{t.loading}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
            <Users className="mb-2 h-10 w-10 text-industrial-300" />
            <p className="text-sm font-semibold text-industrial-500">{t.noData}</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm min-w-[1100px]">
              <thead className="sticky top-0 bg-industrial-800 text-white z-10">
                <tr>
                  <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider">{t.customer}</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider">{t.contact}</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Vehicle</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider">CNIC</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Relation</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider">{t.customerType}</th>
                  <th className="px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Pending Amount</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider">{t.status}</th>
                  <th className="px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wider">{t.action}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-industrial-100">
                {filtered.map((c, idx) => (
                  <tr key={c.id}
                    className={`transition-colors hover:bg-accent-primary/5 cursor-pointer ${idx % 2 !== 0 ? 'bg-industrial-50/40' : 'bg-white'}`}
                    onClick={() => navigate(`/customers/${c.id}`)}>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-industrial-100 border-2 border-industrial-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {c.image_url ? (
                            <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold text-industrial-600">{c.name?.charAt(0)?.toUpperCase() || 'C'}</span>
                          )}
                        </div>
                        <p className="font-semibold text-industrial-900 text-xs">{c.name}</p>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="text-xs text-industrial-700">{c.phone || <span className="italic text-industrial-400">—</span>}</p>
                      {c.address && <p className="text-[10px] text-industrial-400 truncate max-w-[140px]">{c.address}</p>}
                    </td>
                    <td className="px-3 py-2.5">
                      {c.vehicle_number ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-industrial-700">
                          <Car className="w-3 h-3 text-industrial-400" />{c.vehicle_number}
                        </span>
                      ) : <span className="text-industrial-400 text-xs italic">No</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      {c.cnic ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-industrial-700">
                          <CreditCard className="w-3 h-3 text-industrial-400" />{c.cnic}
                        </span>
                      ) : <span className="text-industrial-300 text-xs">—</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      {c.relation_with_me ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-industrial-700">
                          <UsersIcon className="w-3 h-3 text-industrial-400" />{c.relation_with_me}
                        </span>
                      ) : <span className="text-industrial-300 text-xs">—</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${TYPE_COLORS[c.customer_type]}`}>
                        {c.customer_type === 'cash' ? t.cashType : c.customer_type === 'credit' ? t.creditType : t.installmentType}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {c.total_purchased === 0 ? (
                        <span className="text-industrial-300 text-xs">—</span>
                      ) : c.remaining_balance > 0 ? (
                        <div className="inline-flex flex-col items-end gap-0.5">
                          <span className="font-black text-red-600 text-sm leading-tight">{H(c.remaining_balance)}</span>
                          <div className="flex items-center gap-1.5 text-[10px] text-industrial-400 font-medium">
                            <span>Total {H(c.total_purchased)}</span>
                            <span className="text-industrial-300">·</span>
                            <span className="text-green-600">Paid {H(c.total_paid)}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-green-100 text-green-700">Paid ✓</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {c.total_purchased === 0 ? (
                        <span className="inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-industrial-100 text-industrial-400">No Sales Yet</span>
                      ) : c.remaining_balance > 0 ? (
                        <span className="inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-yellow-100 text-yellow-700">Has Balance</span>
                      ) : (
                        <span className="inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-green-100 text-green-700">Clear</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <span onClick={(e) => e.stopPropagation()}>
                          <AttachmentManager entityType="customer" entityId={c.id} label={c.name} />
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingCustomer(c); setEditModalOpen(true); }}
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-500 text-white px-3 py-1.5 text-[10px] font-bold hover:bg-blue-600 transition-colors whitespace-nowrap">
                          {isUrdu ? 'ترمیم' : 'Edit'}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/customers/${c.id}`); }}
                          className="inline-flex items-center gap-1 rounded-lg bg-accent-primary text-white px-3 py-1.5 text-[10px] font-bold hover:bg-accent-primary/90 transition-colors whitespace-nowrap">
                          {isUrdu ? 'تفصیل' : 'View Details'}
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CustomerFormModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={() => { setAddModalOpen(false); load(); }}
      />
      <CustomerFormModal
        open={editModalOpen}
        onClose={() => { setEditModalOpen(false); setEditingCustomer(null); }}
        onSuccess={() => { setEditModalOpen(false); setEditingCustomer(null); load(); }}
        editCustomer={editingCustomer}
      />
    </div>
  );
}

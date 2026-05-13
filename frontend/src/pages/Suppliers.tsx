import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, Eye, Plus, Pencil, Trash2, Truck } from 'lucide-react';
import { api } from '../lib/api';
import { useLang } from '../lib/i18n';
import { AttachmentManager } from '../components/AttachmentManager';
import { SupplierFormModal } from '../components/SupplierFormModal';
import { SupplierDetailModal } from '../components/SupplierDetailModal';

interface Supplier {
  id: number;
  name: string;
  phone: string;
  address: string;
  contact_person?: string;
  dealer_name?: string;
  business_name?: string;
  cnic?: string;
  image_url?: string;
}

interface SupplierLedgerSummary {
  totalPurchased: number;
  totalPaid: number;
  balance: number;
}

export default function SuppliersPage() {
  const { isUrdu } = useLang();
  const navigate = useNavigate();
  const location = useLocation();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [ledgerMap, setLedgerMap] = useState<Record<number, SupplierLedgerSummary>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null);

  // Auto-open add modal when navigated with ?add=1
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('add') === '1') {
      setEditingSupplier(null);
      setModalOpen(true);
      navigate('/suppliers', { replace: true });
    }
  }, [location.search]);

  const load = async () => {
    setLoading(true);
    try {
      const { data: suppliersData } = await api.get<Supplier[]>('/suppliers');
      setSuppliers(suppliersData);
    } finally {
      setLoading(false);
    }
    // Fetch purchase summary separately so it doesn't block the table
    try {
      const { data: ledgerData } = await api.get<
        { supplier: Supplier; totalPurchased: number; totalPaid: number; balance: number }[]
      >('/mill-payments/ledger');
      const map: Record<number, SupplierLedgerSummary> = {};
      for (const row of ledgerData) {
        map[row.supplier.id] = {
          totalPurchased: row.totalPurchased,
          totalPaid: row.totalPaid,
          balance: row.balance,
        };
      }
      setLedgerMap(map);
    } catch {
      // Purchase totals are supplementary; don't break the page if this fails
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this supplier?')) return;
    await api.delete(`/suppliers/${id}`);
    await load();
  };

  const filtered = suppliers.filter(
    (s) =>
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.phone && s.phone.includes(search)) ||
      (s.business_name && s.business_name.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className={`flex flex-col h-[calc(100vh-9rem)] gap-3 ${isUrdu ? 'font-urdu' : ''}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-industrial-900">Dealers</h1>
          <p className="text-sm text-industrial-500 mt-0.5">Manage your dealers — they appear in Stock In and Cement Brands.</p>
        </div>
        <button
          onClick={() => { setEditingSupplier(null); setModalOpen(true); }}
          className="flex items-center gap-2 rounded-xl bg-accent-primary px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-accent-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Dealer
        </button>
      </div>

      {/* Search + Table panel */}
      <div className="flex-1 flex flex-col rounded-xl border-2 border-industrial-200 bg-white overflow-hidden min-h-0">
        <div className="shrink-0 px-4 py-3 border-b border-industrial-100">
          <input
            type="text"
            placeholder="Search by name, phone or business…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm rounded-lg border border-industrial-200 px-4 py-2 text-sm focus:border-industrial-500 focus:outline-none"
          />
        </div>
        <div className="flex-1 overflow-auto">
      {loading ? (
        <p className="py-10 text-center text-industrial-500">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Truck className="h-12 w-12 text-industrial-300 mb-3" />
          <p className="font-semibold text-industrial-500">No dealers yet</p>
          <p className="text-sm text-industrial-400 mt-1">Add your first dealer to get started.</p>
        </div>
      ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-industrial-800 text-white z-10">
              <tr>
                <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider">Dealer</th>
                <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider">Contact</th>
                <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider">Dealer / CNIC</th>
                <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wider">Total Purchased</th>
                <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wider">Paid</th>
                <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wider">Balance</th>
                <th className="px-5 py-3.5 text-center text-xs font-bold uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-industrial-100">
              {filtered.map((s) => {
                  const summary = ledgerMap[s.id];
                  return (
                <tr key={s.id} className="hover:bg-industrial-50 transition-colors cursor-pointer" onClick={() => setViewingSupplier(s)}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 rounded-full border-2 border-industrial-200 bg-industrial-100 flex items-center justify-center overflow-hidden">
                        {s.image_url ? (
                          <img src={s.image_url} alt={s.name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-sm font-bold text-industrial-600">{s.name?.charAt(0)?.toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-industrial-900">{s.name}</p>
                        {s.address && <p className="text-xs text-industrial-400 mt-0.5">{s.address}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {s.phone ? <p className="text-industrial-700">{s.phone}</p> : <span className="text-industrial-400">—</span>}
                    {s.contact_person && <p className="text-xs text-industrial-400 mt-0.5">👤 {s.contact_person}</p>}
                  </td>
                  <td className="px-5 py-4">
                    {s.dealer_name && <p className="text-industrial-700">👤 {s.dealer_name}</p>}
                    {s.cnic && <p className="text-xs text-industrial-500 mt-0.5">🪪 {s.cnic}</p>}
                    {!s.dealer_name && !s.cnic && <span className="text-industrial-400">—</span>}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {summary ? (
                      <span className="font-semibold text-industrial-900">
                        Rs {summary.totalPurchased.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-industrial-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {summary ? (
                      <span className="font-semibold text-green-700">
                        Rs {summary.totalPaid.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-industrial-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {summary ? (
                      <span className={`font-bold ${summary.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        Rs {summary.balance.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-industrial-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/mill-ledger?supplier=${s.id}`); }}
                        className="rounded-lg border border-blue-200 p-2 text-blue-500 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                        title="View Ledger"
                      >
                        <BookOpen className="h-4 w-4" />
                      </button>
                      <span onClick={(e) => e.stopPropagation()}>
                        <AttachmentManager entityType="supplier" entityId={s.id} label={s.name} />
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setViewingSupplier(s); }}
                        className="rounded-lg border border-industrial-200 p-2 text-industrial-500 hover:bg-industrial-100 hover:text-industrial-800 transition-colors"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingSupplier(s); setModalOpen(true); }}
                        className="rounded-lg border border-industrial-200 p-2 text-industrial-500 hover:bg-industrial-100 hover:text-industrial-800 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                        className="rounded-lg border border-red-200 p-2 text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                  );
              })}
            </tbody>
          </table>
      )}
        </div>
      </div>

      <SupplierFormModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingSupplier(null); }}
        onSuccess={() => { setModalOpen(false); setEditingSupplier(null); load(); }}
        editSupplier={editingSupplier}
      />

      <SupplierDetailModal
        supplier={viewingSupplier}
        ledgerSummary={viewingSupplier ? (ledgerMap[viewingSupplier.id] ?? null) : null}
        onClose={() => setViewingSupplier(null)}
        onEdit={(s) => { setViewingSupplier(null); setEditingSupplier(s); setModalOpen(true); }}
      />
    </div>
  );
}

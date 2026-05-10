import { useEffect, useState, useMemo } from 'react';
import {
  Plus, Pencil, Trash2, Truck, HardHat, Home, Zap, UserCheck,
  Wrench, ReceiptText, X,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Modal } from '../components/ui/modal';
import { api } from '../lib/api';
import { useLang } from '../lib/i18n';
import { fmtCurrency } from '../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = 'transport' | 'labour' | 'rent' | 'utilities' | 'salary' | 'maintenance' | 'other';

interface Expense {
  id: number;
  category: Category;
  amount: number;
  description: string | null;
  date: string;
  createdAt: string;
}

// ─── Category config ─────────────────────────────────────────────────────────

const CATEGORY_META: Record<Category, { color: string; bg: string; border: string; icon: any }> = {
  transport:   { color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200',   icon: Truck },
  labour:      { color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', icon: HardHat },
  rent:        { color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', icon: Home },
  utilities:   { color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200', icon: Zap },
  salary:      { color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200',  icon: UserCheck },
  maintenance: { color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200',    icon: Wrench },
  other:       { color: 'text-industrial-700',   bg: 'bg-industrial-50',   border: 'border-industrial-200',   icon: ReceiptText },
};

const CATEGORIES: Category[] = ['transport', 'labour', 'rent', 'utilities', 'salary', 'maintenance', 'other'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr() { return new Date().toISOString().slice(0, 10); }
function monthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

// ─── Empty form ───────────────────────────────────────────────────────────────

const emptyForm = (): { category: Category; amount: string; description: string; date: string } => ({
  category: 'transport', amount: '', description: '', date: todayStr(),
});

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Expenses() {
  const { t, isUrdu } = useLang();
  const locale = isUrdu ? 'ur-PK' : 'en-PK';

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayStr());
  const [loading, setLoading] = useState(false);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // ── load ─────────────────────────────────────────────────────────────────

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<Expense[]>('/expenses', { params: { from, to } });
      setExpenses(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [from, to]);

  // ── summary ──────────────────────────────────────────────────────────────

  const summary = useMemo(() => {
    const byCategory: Record<string, number> = {};
    let total = 0;
    for (const e of expenses) {
      byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
      total += e.amount;
    }
    return { byCategory, total };
  }, [expenses]);

  // ── grouped by date ───────────────────────────────────────────────────────

  const grouped = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const e of expenses) {
      const d = e.date.slice(0, 10);
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(e);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [expenses]);

  // ── modal helpers ─────────────────────────────────────────────────────────

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (exp: Expense) => {
    setEditing(exp);
    setForm({
      category: exp.category,
      amount: String(exp.amount),
      description: exp.description ?? '',
      date: exp.date.slice(0, 10),
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.amount || Number(form.amount) <= 0) {
      setFormError('Amount must be greater than 0.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        category: form.category,
        amount: Number(form.amount),
        description: form.description.trim() || undefined,
        date: form.date,
      };
      if (editing) {
        await api.patch(`/expenses/${editing.id}`, payload);
      } else {
        await api.post('/expenses', payload);
      }
      setModalOpen(false);
      await load();
    } catch (err: any) {
      setFormError(err?.response?.data?.message ?? 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t.confirmDeleteExp)) return;
    await api.delete(`/expenses/${id}`);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  // ── Category label helper ─────────────────────────────────────────────────

  const catLabel = (c: Category) => {
    const map: Record<Category, string> = {
      transport: t.catTransport, labour: t.catLabour, rent: t.catRent,
      utilities: t.catUtilities, salary: t.catSalary,
      maintenance: t.catMaintenance, other: t.catOther,
    };
    return map[c] ?? c;
  };

  // ── Quick date filters ────────────────────────────────────────────────────

  const applyPreset = (preset: 'today' | 'week' | 'month') => {
    const now = new Date();
    if (preset === 'today') { setFrom(todayStr()); setTo(todayStr()); return; }
    if (preset === 'month') { setFrom(monthStart()); setTo(todayStr()); return; }
    // week: last 7 days
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    setFrom(start.toISOString().slice(0, 10));
    setTo(todayStr());
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={`flex flex-col h-[calc(100vh-9rem)] gap-3 ${isUrdu ? 'font-urdu' : ''}`}>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-industrial-900">{t.expensesTitle}</h1>
          <p className="text-sm text-industrial-500 mt-1">{t.expensesSubtitle}</p>
        </div>
        <Button onClick={openAdd} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          {t.addExpense}
        </Button>
      </div>

      {/* Date filter */}
      <div className="flex flex-wrap items-center gap-3 shrink-0">
        <div className="flex rounded-xl border-2 border-industrial-200 overflow-hidden">
          {(['today', 'week', 'month'] as const).map((p) => (
            <button
              key={p}
              onClick={() => applyPreset(p)}
              className="px-4 py-2 text-sm font-semibold text-industrial-600 hover:bg-industrial-50 border-r border-industrial-200 last:border-r-0 transition-colors"
            >
              {p === 'today' ? (isUrdu ? 'آج' : 'Today') : p === 'week' ? (isUrdu ? '7 دن' : '7 Days') : (isUrdu ? 'اس ماہ' : 'This Month')}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
          <span className="text-industrial-400">—</span>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 shrink-0">
        {CATEGORIES.map((cat) => {
          const meta = CATEGORY_META[cat];
          const Icon = meta.icon;
          const amt = summary.byCategory[cat] ?? 0;
          return (
            <div
              key={cat}
              className={`flex flex-col gap-1.5 rounded-xl border-2 ${meta.border} ${meta.bg} px-4 py-4`}
            >
              <div className="flex items-center gap-1.5">
                <Icon className={`h-4 w-4 ${meta.color}`} />
                <span className={`text-xs font-bold uppercase tracking-wider ${meta.color}`}>{catLabel(cat)}</span>
              </div>
              <p className={`text-xl font-black ${amt > 0 ? meta.color : 'text-industrial-300'}`}>
                {fmtCurrency(amt)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Grand total bar */}
      <div className="flex items-center justify-between rounded-xl bg-industrial-800 px-6 py-4 text-white shrink-0">
        <span className="text-sm font-semibold text-industrial-300 uppercase tracking-widest">
          {t.totalExpenses} ({expenses.length} {isUrdu ? 'اندراجات' : 'entries'})
        </span>
        <span className="text-2xl font-black">{fmtCurrency(summary.total)}</span>
      </div>

      {/* Expense list grouped by date */}
      <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
      {loading ? (
        <p className="py-8 text-center text-industrial-400">{t.loading}</p>
      ) : grouped.length === 0 ? (
        <div className="rounded-xl border-2 border-industrial-200 bg-white">
          <p className="py-12 text-center text-industrial-400 font-medium">{t.noExpenses}</p>
        </div>
      ) : (
        grouped.map(([date, items]) => {
          const dayTotal = items.reduce((s, e) => s + e.amount, 0);
          return (
            <div key={date} className="rounded-xl border-2 border-industrial-200 bg-white overflow-hidden">
              {/* Day header */}
              <div className="flex items-center justify-between border-b border-industrial-200 px-6 py-4 bg-industrial-50">
                <div>
                  <p className="font-bold text-industrial-900 text-base">
                    {new Date(date + 'T12:00:00').toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <span className="font-black text-lg text-accent-danger">{fmtCurrency(dayTotal)}</span>
              </div>

              {/* Rows */}
              <div className="divide-y divide-industrial-100">
                {items.map((exp) => {
                  const meta = CATEGORY_META[exp.category];
                  const Icon = meta.icon;
                  return (
                    <div key={exp.id} className="flex items-center gap-4 px-6 py-4 hover:bg-industrial-50 transition-colors">
                      {/* Icon badge */}
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 ${meta.border} ${meta.bg}`}>
                        <Icon className={`h-5 w-5 ${meta.color}`} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${meta.border} ${meta.bg} ${meta.color}`}>
                            {catLabel(exp.category)}
                          </span>
                          {exp.description && (
                            <span className="text-sm text-industrial-700 font-medium truncate">{exp.description}</span>
                          )}
                        </div>
                        <p className="text-xs text-industrial-400 mt-0.5">
                          {new Date(exp.createdAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>

                      {/* Amount */}
                      <p className="text-lg font-black text-accent-danger shrink-0">{fmtCurrency(exp.amount)}</p>

                      {/* Actions */}
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => openEdit(exp)}
                          className="rounded-lg p-2 text-industrial-400 hover:bg-industrial-100 hover:text-accent-primary transition-colors"
                          title={t.editExpense}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(exp.id)}
                          className="rounded-lg p-2 text-industrial-400 hover:bg-red-50 hover:text-accent-danger transition-colors"
                          title={t.deleteExpense}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        open={modalOpen}
        title={editing ? t.editExpense : t.addExpense}
        onClose={() => setModalOpen(false)}
      >
        <div className="space-y-5">
          {/* Category picker */}
          <div>
            <label className="mb-2 block text-sm font-bold text-industrial-700">{t.expenseCategory}</label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map((cat) => {
                const meta = CATEGORY_META[cat];
                const Icon = meta.icon;
                const active = form.category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setForm({ ...form, category: cat })}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3 text-xs font-semibold transition-all ${
                      active
                        ? `${meta.border} ${meta.bg} ${meta.color} shadow-sm`
                        : 'border-industrial-200 bg-white text-industrial-500 hover:border-industrial-300'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {catLabel(cat)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-bold text-industrial-700">
                {t.expenseAmount} <span className="text-accent-danger">*</span>
              </label>
              <Input
                type="number"
                placeholder="0"
                autoFocus
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="text-lg font-bold"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold text-industrial-700">{t.expenseDate}</label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-2 block text-sm font-bold text-industrial-700">
              {t.expenseDesc} <span className="text-industrial-400 font-normal">({isUrdu ? 'اختیاری' : 'optional'})</span>
            </label>
            <Input
              placeholder={t.expenseDescPlaceholder}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          {formError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <X className="h-4 w-4 text-red-500 shrink-0" />
              <p className="text-sm font-semibold text-red-700">{formError}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? (isUrdu ? 'محفوظ ہو رہا ہے…' : 'Saving…') : t.save}
            </Button>
            <Button onClick={() => setModalOpen(false)} variant="outline" className="flex-1">
              {t.cancel}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

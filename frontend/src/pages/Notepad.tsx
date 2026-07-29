import { useEffect, useMemo, useState } from 'react';
import {
  BookText,
  CalendarDays,
  FileText,
  Pencil,
  Plus,
  Save,
  StickyNote,
  Trash2,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { AttachmentManager } from '../components/AttachmentManager';
import { api } from '../lib/api';

interface NotepadEntry {
  id: number;
  entry_date: string;
  title: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function monthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

const emptyForm = () => ({
  entry_date: todayStr(),
  title: '',
  content: '',
});

export default function Notepad() {
  const [entries, setEntries] = useState<NotepadEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<number | 'new'>('new');
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayStr());
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<NotepadEntry[]>('/notepad', {
        params: { from, to },
      });
      setEntries(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [from, to]);

  const selectedEntry = useMemo(
    () => entries.find((item) => item.id === selectedId) ?? null,
    [entries, selectedId],
  );

  useEffect(() => {
    if (selectedEntry) {
      setForm({
        entry_date: selectedEntry.entry_date,
        title: selectedEntry.title ?? '',
        content: selectedEntry.content,
      });
      setError('');
      return;
    }

    if (selectedId === 'new') {
      setForm(emptyForm());
      setError('');
    }
  }, [selectedEntry, selectedId]);

  const groupedEntries = useMemo(() => {
    const map = new Map<string, NotepadEntry[]>();
    for (const entry of entries) {
      if (!map.has(entry.entry_date)) map.set(entry.entry_date, []);
      map.get(entry.entry_date)!.push(entry);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [entries]);

  const openNew = () => {
    setSelectedId('new');
    setForm(emptyForm());
  };

  const handleSave = async () => {
    if (!form.content.trim()) {
      setError('Please write something in the diary note.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        entry_date: form.entry_date,
        title: form.title.trim() || undefined,
        content: form.content,
      };

      if (selectedEntry) {
        const { data } = await api.patch<NotepadEntry>(
          `/notepad/${selectedEntry.id}`,
          payload,
        );
        setEntries((prev) =>
          prev.map((item) => (item.id === data.id ? data : item)),
        );
      } else {
        const { data } = await api.post<NotepadEntry>('/notepad', payload);
        setEntries((prev) => [data, ...prev]);
        setSelectedId(data.id);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to save note.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this diary note?')) return;
    await api.delete(`/notepad/${id}`);
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
    if (selectedId === id) openNew();
  };

  return (
    <div className="flex min-h-[calc(100vh-11rem)] gap-6">
      <aside className="w-[22rem] shrink-0 rounded-2xl border-2 border-industrial-200 bg-white shadow-industrial">
        <div className="border-b border-industrial-200 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-black text-industrial-900">Daily Notepad</h1>
              <p className="mt-1 text-sm text-industrial-500">
                Write daily diary notes and keep documents with each entry.
              </p>
            </div>
            <Button onClick={openNew} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New
            </Button>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>

        <div className="max-h-[calc(100vh-18rem)] overflow-y-auto p-3">
          {loading ? (
            <p className="py-8 text-center text-sm font-medium text-industrial-400">Loading notes...</p>
          ) : groupedEntries.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-industrial-300 bg-industrial-50 px-5 py-10 text-center">
              <StickyNote className="h-8 w-8 text-industrial-300" />
              <p className="text-sm font-medium text-industrial-500">No diary notes in this date range yet.</p>
            </div>
          ) : (
            groupedEntries.map(([date, items]) => (
              <div key={date} className="mb-4">
                <div className="mb-2 flex items-center gap-2 px-2">
                  <CalendarDays className="h-4 w-4 text-industrial-400" />
                  <p className="text-xs font-bold uppercase tracking-wider text-industrial-500">
                    {new Date(`${date}T12:00:00`).toLocaleDateString('en-PK', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="space-y-2">
                  {items.map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => setSelectedId(entry.id)}
                      className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                        selectedId === entry.id
                          ? 'border-accent-primary bg-blue-50'
                          : 'border-industrial-200 bg-white hover:bg-industrial-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-industrial-900">
                            {entry.title?.trim() || 'Untitled note'}
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs text-industrial-500">
                            {entry.content}
                          </p>
                        </div>
                        <BookText className="mt-0.5 h-4 w-4 shrink-0 text-industrial-300" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col rounded-2xl border-2 border-industrial-200 bg-white shadow-industrial">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-industrial-200 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-industrial-400">
              {selectedEntry ? 'Diary Entry' : 'New Diary Entry'}
            </p>
            <h2 className="mt-1 text-2xl font-black text-industrial-900">
              {selectedEntry?.title?.trim() || form.title.trim() || 'Daily Notes'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {selectedEntry && (
              <Button
                variant="outline"
                onClick={() => setSelectedId(selectedEntry.id)}
                className="flex items-center gap-2"
              >
                <Pencil className="h-4 w-4" />
                Editing
              </Button>
            )}
            {selectedEntry && (
              <Button
                variant="outline"
                onClick={() => handleDelete(selectedEntry.id)}
                className="flex items-center gap-2 text-accent-danger hover:text-accent-danger"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            )}
            <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Note'}
            </Button>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
          <div className="grid gap-4 md:grid-cols-[14rem_1fr]">
            <div>
              <label className="mb-2 block text-sm font-bold text-industrial-700">Entry Date</label>
              <Input
                type="date"
                value={form.entry_date}
                onChange={(e) => setForm((prev) => ({ ...prev, entry_date: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold text-industrial-700">Title</label>
              <Input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. Daily stock summary, supplier follow-up, dispatch notes"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-industrial-700">Diary Note</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
              placeholder="Write the full daily note here. You can keep reminders, meeting notes, pending tasks, delivery details, and attach files after saving."
              className="min-h-[20rem] w-full rounded-xl border-2 border-industrial-300 bg-industrial-50 px-4 py-3 text-sm font-medium text-industrial-900 outline-none transition-colors focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20"
            />
          </div>

          {error && (
            <div className="rounded-xl border-2 border-accent-danger/20 bg-accent-danger/10 px-4 py-3 text-sm font-semibold text-accent-danger">
              {error}
            </div>
          )}

          {selectedEntry ? (
            <div className="rounded-2xl border border-industrial-200 bg-industrial-50 px-5 py-4">
              <div className="mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-industrial-500" />
                <p className="text-sm font-bold text-industrial-700">Attachments</p>
              </div>
              <p className="mb-4 text-sm text-industrial-500">
                Upload invoices, delivery slips, letters, images, or any related documents for this diary note.
              </p>
              <AttachmentManager
                entityType="notepad"
                entityId={selectedEntry.id}
                label={selectedEntry.title || `Diary note ${selectedEntry.entry_date}`}
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-industrial-300 bg-industrial-50 px-5 py-6 text-sm text-industrial-500">
              Save the note first, then you can upload files and documents for it.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

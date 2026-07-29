import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Modal } from './ui/modal';

export interface ManagedOption {
  id: number;
  name: string;
}

interface ManagedOptionsModalProps {
  open: boolean;
  scope: string;
  title: string;
  createLabel: string;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
}

export function ManagedOptionsModal({
  open,
  scope,
  title,
  createLabel,
  onClose,
  onChanged,
}: ManagedOptionsModalProps) {
  const [options, setOptions] = useState<ManagedOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get<ManagedOption[]>(`/options/${scope}`);
      setOptions(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load options');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      void load();
    }
  }, [open]);

  const createOption = async () => {
    if (!draft.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
      await api.post(`/options/${scope}`, { name: draft });
      setDraft('');
      await load();
      await onChanged();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create option');
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!editingId || !editingName.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
      await api.patch(`/options/${scope}/${editingId}`, { name: editingName });
      setEditingId(null);
      setEditingName('');
      await load();
      await onChanged();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update option');
    } finally {
      setSaving(false);
    }
  };

  const removeOption = async (id: number) => {
    if (!window.confirm('Delete this option?')) return;
    setSaving(true);
    setError('');
    try {
      await api.delete(`/options/${scope}/${id}`);
      await load();
      await onChanged();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to delete option');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <div className="space-y-4">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={createLabel}
            disabled={saving}
          />
          <Button onClick={createOption} disabled={saving || !draft.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="max-h-[45vh] overflow-y-auto rounded-xl border border-industrial-200">
          {loading ? (
            <p className="px-4 py-6 text-center text-sm text-industrial-500">Loading…</p>
          ) : options.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-industrial-500">No options yet</p>
          ) : (
            <div className="divide-y divide-industrial-100">
              {options.map((option) => (
                <div key={option.id} className="flex items-center gap-2 px-4 py-3">
                  {editingId === option.id ? (
                    <>
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        disabled={saving}
                      />
                      <Button onClick={saveEdit} disabled={saving || !editingName.trim()} size="sm">
                        Save
                      </Button>
                      <Button
                        onClick={() => {
                          setEditingId(null);
                          setEditingName('');
                        }}
                        variant="outline"
                        size="sm"
                        disabled={saving}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 text-sm font-medium text-industrial-800">
                        {option.name}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingId(option.id);
                          setEditingName(option.name);
                        }}
                        disabled={saving}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeOption(option.id)}
                        disabled={saving}
                        className="text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

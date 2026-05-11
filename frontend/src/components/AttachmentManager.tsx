import { useEffect, useRef, useState } from 'react';
import { Paperclip, Upload, Trash2, Download, X, Eye } from 'lucide-react';
import { Button } from './ui/button';
import { Modal } from './ui/modal';
import { api } from '../lib/api';

interface Attachment {
  id: number;
  originalName: string;
  filename: string;
  mimetype: string;
  size: number;
  entityType: string;
  entityId: number;
  createdAt: string;
}

interface Props {
  entityType: string;
  entityId: number;
  label?: string;
  className?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(mimetype: string) {
  if (mimetype.startsWith('image/')) return '🖼️';
  if (mimetype === 'application/pdf') return '📄';
  if (mimetype.includes('word') || mimetype.includes('document')) return '📝';
  if (mimetype.includes('sheet') || mimetype.includes('excel') || mimetype.includes('csv')) return '📊';
  return '📎';
}

function isViewable(mimetype: string) {
  return mimetype.startsWith('image/') || mimetype === 'application/pdf';
}

// ── Inline preview overlay ────────────────────────────────────────────────────
function PreviewOverlay({ att, onClose, onDownload }: {
  att: Attachment;
  onClose: () => void;
  onDownload: (att: Attachment) => void;
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.get(`/attachments/${att.id}/file`, { responseType: 'blob' }).then(res => {
      if (!active) return;
      setBlobUrl(URL.createObjectURL(res.data as Blob));
      setLoading(false);
    }).catch(() => setLoading(false));
    return () => { active = false; };
  }, [att.id]);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/90" onClick={onClose}>
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-black/60 shrink-0"
        onClick={e => e.stopPropagation()}
      >
        <p className="truncate text-sm font-semibold text-white max-w-[60vw]">{att.originalName}</p>
        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={() => onDownload(att)}
            className="flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-sm text-white hover:bg-white/25 transition-colors"
          >
            <Download className="h-4 w-4" /> Download
          </button>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-white hover:bg-white/25 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 items-center justify-center overflow-hidden p-4" onClick={onClose}>
        {loading && (
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        )}
        {!loading && blobUrl && att.mimetype.startsWith('image/') && (
          <img
            src={blobUrl}
            alt={att.originalName}
            className="max-h-full max-w-full rounded-xl object-contain shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        )}
        {!loading && blobUrl && att.mimetype === 'application/pdf' && (
          <iframe
            src={blobUrl}
            title={att.originalName}
            className="h-full w-full max-w-4xl rounded-xl bg-white shadow-2xl"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          />
        )}
        {!loading && !blobUrl && (
          <p className="text-white/60 text-sm">Could not load preview.</p>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function AttachmentManager({ entityType, entityId, label, className }: Props) {
  const [open, setOpen] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<Attachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      const { data } = await api.get<Attachment[]>('/attachments', {
        params: { entityType, entityId },
      });
      setAttachments(data);
    } catch {
      setAttachments([]);
    }
  };

  // Load count on mount so badge shows without opening
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.post('/attachments', formData, {
        params: { entityType, entityId },
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownload = async (att: Attachment) => {
    try {
      const response = await api.get(`/attachments/${att.id}/file`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = att.originalName;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this attachment?')) return;
    try {
      await api.delete(`/attachments/${id}`);
      setAttachments((prev) => prev.filter((a) => a.id !== id));
    } catch { /* ignore */ }
  };

  const title = label ? `Attachments — ${label}` : 'Attachments';

  return (
    <>
      {/* Trigger button */}
      <button
        className={`relative inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-industrial-600 border border-industrial-300 bg-white hover:bg-industrial-50 hover:text-industrial-900 transition-colors ${className ?? ''}`}
        title="Attachments"
        onClick={() => setOpen(true)}
      >
        <Paperclip className="h-3.5 w-3.5" />
        Attach
        {attachments.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent-primary text-white text-[10px] font-black">
            {attachments.length}
          </span>
        )}
      </button>

      {/* Preview overlay */}
      {preview && (
        <PreviewOverlay
          att={preview}
          onClose={() => setPreview(null)}
          onDownload={handleDownload}
        />
      )}

      {/* Modal */}
      <Modal open={open} title={title} onClose={() => setOpen(false)}>
        <div className="space-y-4">
          {/* Upload area */}
          <div
            className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-industrial-300 bg-industrial-50 p-6 cursor-pointer hover:border-accent-primary hover:bg-blue-50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-7 w-7 text-industrial-400" />
            <p className="text-sm font-semibold text-industrial-600">
              {uploading ? 'Uploading…' : 'Click to upload a file'}
            </p>
            <p className="text-xs text-industrial-400">PDF, images, Word, Excel — max 20 MB</p>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </div>

          {error && (
            <p className="text-sm font-semibold text-accent-danger flex items-center gap-2">
              <X className="h-4 w-4" /> {error}
            </p>
          )}

          {/* Attachment list */}
          {attachments.length === 0 ? (
            <p className="py-4 text-center text-sm text-industrial-400 font-medium">
              No attachments yet.
            </p>
          ) : (
            <ul className="divide-y divide-industrial-100 rounded-xl border border-industrial-200 overflow-hidden">
              {attachments.map((att) => (
                <li key={att.id} className="flex items-center gap-3 px-4 py-3 hover:bg-industrial-50 transition-colors">
                  <span className="text-2xl shrink-0">{fileIcon(att.mimetype)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-industrial-900">{att.originalName}</p>
                    <p className="text-xs text-industrial-400">
                      {formatBytes(att.size)} · {new Date(att.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {isViewable(att.mimetype) && (
                      <button
                        onClick={() => setPreview(att)}
                        className="rounded-lg p-2 text-industrial-500 hover:bg-industrial-100 hover:text-accent-primary transition-colors"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDownload(att)}
                      className="rounded-lg p-2 text-industrial-500 hover:bg-industrial-100 hover:text-accent-primary transition-colors"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(att.id)}
                      className="rounded-lg p-2 text-industrial-500 hover:bg-red-50 hover:text-accent-danger transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

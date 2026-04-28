import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  CloudOff,
  Database,
  FolderOpen,
  HardDrive,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Unplug,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { useLang } from '../lib/i18n';

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface BackupStatus {
  lastBackupDate: string | null;
  lastBackupSize: number | null;
  totalBackups: number;
  lastCloudBackup: string | null;
  isGoogleConnected: boolean;
}

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number | null): string {
  if (bytes === null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(iso: string | null, locale: string): string {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── TOAST COMPONENT ──────────────────────────────────────────────────────────

function ToastList({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-lg transition-all ${
            t.type === 'success'
              ? 'bg-green-600 text-white'
              : t.type === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-industrial-800 text-white'
          }`}
        >
          {t.type === 'success' && <CheckCircle2 className="h-4 w-4 shrink-0" />}
          {t.type === 'error' && <XCircle className="h-4 w-4 shrink-0" />}
          {t.type === 'info' && <RefreshCw className="h-4 w-4 shrink-0 animate-spin" />}
          <span>{t.message}</span>
          <button onClick={() => onDismiss(t.id)} className="ml-2 opacity-70 hover:opacity-100">✕</button>
        </div>
      ))}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function BackupRestore() {
  const { t, isUrdu } = useLang();
  const locale = isUrdu ? 'ur-PK' : 'en-PK';

  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  // Confirmation dialog for restore
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);

  // ── TOAST HELPERS ──────────────────────────────────────────────────────────

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    if (type !== 'info') {
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
    }
    return id;
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── LOAD STATUS ────────────────────────────────────────────────────────────

  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.get<BackupStatus>('/backup/status');
      setStatus(res.data);
    } catch {
      addToast(t.backupStatusError, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, t]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // ── CLOUD-BACKUP IPC LISTENER ──────────────────────────────────────────────

  useEffect(() => {
    const w = window as any;
    if (!w.factoryPos?.onTriggerCloudBackup) return;

    const cleanup = w.factoryPos.onTriggerCloudBackup(async () => {
      try {
        await api.post('/backup/cloud-now');
        fetchStatus();
      } catch {
        /* silent — background task */
      }
    });

    return () => cleanup?.();
  }, [fetchStatus]);

  // ── BACKUP NOW ─────────────────────────────────────────────────────────────

  const handleBackupNow = async () => {
    setBackingUp(true);
    const toastId = addToast(t.backupInProgress, 'info');
    try {
      await api.post('/backup/now');
      dismissToast(toastId);
      addToast(t.backupSuccess, 'success');
      await fetchStatus();
    } catch {
      dismissToast(toastId);
      addToast(t.backupFailed, 'error');
    } finally {
      setBackingUp(false);
    }
  };

  // ── RESTORE FROM FILE ──────────────────────────────────────────────────────

  const handleRestoreClick = async () => {
    const w = window as any;

    let filePath: string | null = null;

    if (w.factoryPos?.showOpenDialog) {
      // Running in Electron — use native file dialog
      const result = await w.factoryPos.showOpenDialog({
        title: t.restoreSelectFile,
        filters: [{ name: 'SQLite Database', extensions: ['db', 'sqlite'] }],
        properties: ['openFile'],
      });
      if (result.canceled || !result.filePaths[0]) return;
      filePath = result.filePaths[0];
    } else {
      // Dev/browser fallback — file input
      filePath = await promptFilePathViaInput();
      if (!filePath) return;
    }

    setConfirmRestore(filePath);
  };

  const handleConfirmRestore = async () => {
    if (!confirmRestore) return;
    setConfirmRestore(null);
    setRestoring(true);
    const toastId = addToast(t.restoreInProgress, 'info');
    try {
      await api.post('/backup/restore', { filePath: confirmRestore });
      dismissToast(toastId);
      addToast(t.restoreSuccess, 'success');
      // Recommend restart
      setTimeout(() => addToast(t.restartRequired, 'info'), 1000);
    } catch (err: any) {
      dismissToast(toastId);
      addToast(err?.response?.data?.message ?? t.restoreFailed, 'error');
    } finally {
      setRestoring(false);
    }
  };

  // ── GOOGLE DRIVE ───────────────────────────────────────────────────────────

  const handleConnectGoogle = async () => {
    setConnecting(true);
    try {
      const res = await api.get<{ url: string }>('/backup/auth-url');
      const w = window as any;
      if (w.factoryPos?.openExternal) {
        await w.factoryPos.openExternal(res.data.url);
      } else {
        window.open(res.data.url, '_blank');
      }
      // Poll for connection every 3s for up to 60s
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        await fetchStatus();
        setStatus((s) => {
          if (s?.isGoogleConnected) {
            clearInterval(poll);
            addToast(t.googleConnected, 'success');
            setConnecting(false);
          }
          return s;
        });
        if (attempts > 20) {
          clearInterval(poll);
          setConnecting(false);
        }
      }, 3000);
    } catch {
      addToast(t.googleConnectFailed, 'error');
      setConnecting(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    setDisconnecting(true);
    try {
      await api.post('/backup/disconnect-google');
      addToast(t.googleDisconnected, 'success');
      await fetchStatus();
    } catch {
      addToast(t.googleConnectFailed, 'error');
    } finally {
      setDisconnecting(false);
    }
  };

  // ── RENDER ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-industrial-400" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isUrdu ? 'font-urdu' : ''}`}>
      <h1 className="text-2xl font-bold text-industrial-900">{t.backupRestore}</h1>

      {/* ── STATUS CARDS ──────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Last Local Backup */}
        <div className="industrial-card rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100">
              <HardDrive className="h-5 w-5 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-industrial-500">{t.lastLocalBackup}</p>
              <p className="mt-1 text-sm font-semibold text-industrial-900 truncate">
                {formatDate(status?.lastBackupDate ?? null, locale)}
              </p>
              <p className="mt-0.5 text-xs text-industrial-400">{formatBytes(status?.lastBackupSize ?? null)}</p>
            </div>
          </div>
        </div>

        {/* Last Cloud Backup */}
        <div className="industrial-card rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${status?.isGoogleConnected ? 'bg-green-100' : 'bg-industrial-100'}`}>
              {status?.isGoogleConnected ? (
                <Cloud className="h-5 w-5 text-green-600" />
              ) : (
                <CloudOff className="h-5 w-5 text-industrial-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-industrial-500">{t.lastCloudBackup}</p>
              <p className="mt-1 text-sm font-semibold text-industrial-900 truncate">
                {formatDate(status?.lastCloudBackup ?? null, locale)}
              </p>
              <p className="mt-0.5 text-xs text-industrial-400">
                {status?.isGoogleConnected ? t.googleConnectedLabel : t.googleNotConnected}
              </p>
            </div>
          </div>
        </div>

        {/* Total Backups */}
        <div className="industrial-card rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-100">
              <Database className="h-5 w-5 text-purple-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-industrial-500">{t.totalBackups}</p>
              <p className="mt-1 text-2xl font-bold text-industrial-900">{status?.totalBackups ?? 0}</p>
              <p className="mt-0.5 text-xs text-industrial-400">{t.storedLocally}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── GOOGLE DRIVE SECTION ──────────────────────────────────────── */}
      <div className="industrial-card rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <ShieldCheck className="h-5 w-5 text-industrial-600" />
          <h2 className="text-base font-semibold text-industrial-900">{t.googleDriveBackup}</h2>
        </div>

        {status?.isGoogleConnected ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </span>
              <div>
                <p className="text-sm font-semibold text-green-700">{t.googleConnectedLabel}</p>
                <p className="text-xs text-industrial-400">{t.googleConnectedDesc}</p>
              </div>
            </div>
            <button
              onClick={handleDisconnectGoogle}
              disabled={disconnecting}
              className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors"
            >
              {disconnecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Unplug className="h-4 w-4" />
              )}
              {t.disconnect}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-industrial-700">{t.googleDriveDesc}</p>
              <p className="mt-1 text-xs text-industrial-400">{t.googleDriveDescSub}</p>
            </div>
            <button
              onClick={handleConnectGoogle}
              disabled={connecting}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {connecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Cloud className="h-4 w-4" />
              )}
              {t.connectGoogleDrive}
            </button>
          </div>
        )}
      </div>

      {/* ── ACTIONS ───────────────────────────────────────────────────── */}
      <div className="industrial-card rounded-xl p-6">
        <h2 className="mb-4 text-base font-semibold text-industrial-900">{t.backupActions}</h2>
        <div className="flex flex-wrap gap-4">
          {/* Backup Now */}
          <button
            onClick={handleBackupNow}
            disabled={backingUp}
            className="flex items-center gap-2 rounded-lg bg-accent-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-all shadow-industrial"
          >
            {backingUp ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <HardDrive className="h-4 w-4" />
            )}
            {t.backupNow}
          </button>

          {/* Restore from File */}
          <button
            onClick={handleRestoreClick}
            disabled={restoring}
            className="flex items-center gap-2 rounded-lg border border-industrial-300 bg-white px-5 py-2.5 text-sm font-semibold text-industrial-700 hover:bg-industrial-50 disabled:opacity-50 transition-all"
          >
            {restoring ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FolderOpen className="h-4 w-4" />
            )}
            {t.restoreFromFile}
          </button>
        </div>

        <p className="mt-4 text-xs text-industrial-400">{t.backupActionsDesc}</p>
      </div>

      {/* ── CONFIRM RESTORE DIALOG ────────────────────────────────────── */}
      {confirmRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-industrial-900">{t.confirmRestore}</h3>
                <p className="mt-1 text-sm text-industrial-500">{t.confirmRestoreDesc}</p>
                <p className="mt-2 break-all rounded-lg bg-industrial-50 px-3 py-2 font-mono text-xs text-industrial-600">
                  {confirmRestore}
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setConfirmRestore(null)}
                className="rounded-lg border border-industrial-200 px-4 py-2 text-sm font-medium text-industrial-700 hover:bg-industrial-50"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleConfirmRestore}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                {t.restoreNow}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOASTS ────────────────────────────────────────────────────── */}
      <ToastList toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

// ── Browser fallback for file selection (dev only) ─────────────────────────
function promptFilePathViaInput(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.db,.sqlite';
    input.onchange = () => {
      const file = input.files?.[0];
      resolve(file ? (file as any).path ?? file.name : null);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

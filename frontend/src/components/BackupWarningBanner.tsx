import { AlertTriangle, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useLang } from '../lib/i18n';

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export function BackupWarningBanner() {
  const { t, isUrdu } = useLang();
  const [daysSinceBackup, setDaysSinceBackup] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    api
      .get<{ lastBackupDate: string | null }>('/backup/status')
      .then((res: { data: { lastBackupDate: string | null } }) => {
        const last = res.data.lastBackupDate;
        if (!last) {
          setDaysSinceBackup(999); // Never backed up
          return;
        }
        const ms = Date.now() - new Date(last).getTime();
        const days = Math.floor(ms / (24 * 60 * 60 * 1000));
        if (ms > THREE_DAYS_MS) {
          setDaysSinceBackup(days);
        }
      })
      .catch(() => {
        /* fail silently — don't block dashboard */
      });
  }, []);

  if (dismissed || daysSinceBackup === null) return null;

  return (
    <div
      role="alert"
      className={`mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm ${
        isUrdu ? 'flex-row-reverse font-urdu' : ''
      }`}
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
      <p className="flex-1 text-red-800">
        {daysSinceBackup >= 999 ? (
          <>⚠️ {t.backupNeverTaken}{' '}
            <Link to="/backup" className="font-semibold underline hover:text-red-900">
              {t.backupNow}
            </Link>
          </>
        ) : (
          <>⚠️ {t.backupWarningPrefix} <strong>{daysSinceBackup}</strong> {t.backupWarningDays}{' '}
            <Link to="/backup" className="font-semibold underline hover:text-red-900">
              {t.backupNow}
            </Link>
          </>
        )}
      </p>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 text-red-400 hover:text-red-700"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

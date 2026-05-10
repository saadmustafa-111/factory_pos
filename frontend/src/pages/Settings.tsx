import { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { api } from '../lib/api';
import { useLang } from '../lib/i18n';

export default function Settings() {
  const { t, isUrdu } = useLang();
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [message, setMessage] = useState('');

  // Recovery PIN
  const [hasPin, setHasPin] = useState(false);
  const [pinForm, setPinForm] = useState({ currentPassword: '', recoveryPin: '', confirmPin: '' });
  const [pinMessage, setPinMessage] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  const loadPinStatus = async () => {
    try {
      const { data } = await api.get('/auth/recovery-pin-status');
      setHasPin(data.hasPin);
    } catch { /* ignore */ }
  };

  const saveRecoveryPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinMessage('');
    if (!pinForm.recoveryPin.trim()) { setPinMessage('Please enter a PIN'); return; }
    if (pinForm.recoveryPin !== pinForm.confirmPin) { setPinMessage('PINs do not match'); return; }
    setPinLoading(true);
    try {
      await api.post('/auth/set-recovery-pin', {
        currentPassword: pinForm.currentPassword,
        recoveryPin: pinForm.recoveryPin,
      });
      setPinMessage('Recovery PIN saved successfully!');
      setPinForm({ currentPassword: '', recoveryPin: '', confirmPin: '' });
      setHasPin(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setPinMessage(typeof msg === 'string' ? msg : 'Failed to save PIN');
    } finally {
      setPinLoading(false);
    }
  };

  useEffect(() => {
    loadPinStatus();
  }, []);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    try {
      await api.post('/auth/change-password', passwordForm);
      setMessage(t.passwordChanged);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch {
      setMessage(t.passwordChangeFailed);
    }
  };

  return (
    <div className={`space-y-8 ${isUrdu ? 'font-urdu' : ''}`}>

      <Card>
        <div className="border-b border-industrial-200 px-6 py-5 bg-industrial-50">
          <h2 className="text-xl font-bold text-industrial-900">{t.changePassword}</h2>
        </div>
        <div className="p-6">
          <form className="space-y-4" onSubmit={changePassword}>
            <div>
              <label className="mb-2 block text-sm font-semibold text-industrial-700">{t.currentPassword}</label>
              <Input
                type="password"
                placeholder={t.currentPassword}
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-industrial-700">{t.newPassword}</label>
              <Input
                type="password"
                placeholder={t.newPassword}
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-industrial-700">{t.confirmPassword}</label>
              <Input
                type="password"
                placeholder={t.confirmPassword}
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              />
            </div>
            <Button type="submit" className="mt-4">
              {t.changePassword}
            </Button>
          </form>
          {message && <p className={`mt-4 text-sm font-semibold ${message === t.passwordChanged ? 'text-green-600' : 'text-accent-danger'}`}>{message}</p>}
        </div>
      </Card>

      {/* Recovery PIN */}
      <Card>
        <div className="border-b border-industrial-200 px-6 py-5 bg-amber-50">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-industrial-900">Recovery PIN</h2>
              <p className="text-sm text-industrial-500">Used to reset your password if you ever forget it</p>
            </div>
            <div className="ml-auto">
              {hasPin
                ? <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700"><span className="h-2 w-2 rounded-full bg-green-500 inline-block" />PIN Set</span>
                : <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700"><span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />Default (1234)</span>
              }
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="mb-5 rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <strong>How it works:</strong> If you forget your login password, click <em>"Forgot Password?"</em> on the login screen and enter this PIN to reset it. The default PIN is <strong>1234</strong> — change it to something only you know.
          </div>
          <form className="space-y-4" onSubmit={saveRecoveryPin}>
            <div>
              <label className="mb-2 block text-sm font-semibold text-industrial-700">Current Password (to confirm it's you)</label>
              <Input
                type="password"
                placeholder="Enter your current login password"
                value={pinForm.currentPassword}
                onChange={(e) => setPinForm({ ...pinForm, currentPassword: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-industrial-700">New Recovery PIN</label>
                <Input
                  type="password"
                  inputMode="numeric"
                  placeholder="e.g. 5678"
                  value={pinForm.recoveryPin}
                  onChange={(e) => setPinForm({ ...pinForm, recoveryPin: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-industrial-700">Confirm PIN</label>
                <Input
                  type="password"
                  inputMode="numeric"
                  placeholder="Repeat PIN"
                  value={pinForm.confirmPin}
                  onChange={(e) => setPinForm({ ...pinForm, confirmPin: e.target.value })}
                />
              </div>
            </div>
            <Button type="submit" disabled={pinLoading} className="mt-2">
              {pinLoading ? 'Saving...' : (hasPin ? 'Update Recovery PIN' : 'Set Recovery PIN')}
            </Button>
          </form>
          {pinMessage && (
            <p className={`mt-4 text-sm font-semibold ${pinMessage.includes('success') ? 'text-green-600' : 'text-accent-danger'}`}>
              {pinMessage}
            </p>
          )}
        </div>
      </Card>

    </div>
  );
}

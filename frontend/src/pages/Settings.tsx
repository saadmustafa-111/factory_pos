import { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { api } from '../lib/api';
import { useLang } from '../lib/i18n';
import { useFontSize, type SizeStep } from '../lib/font-size';

export default function Settings() {
  const { t, isUrdu } = useLang();
  const { settings: fs, setTableSize, setHeadingSize, setBodySize, reset: resetFs } = useFontSize();
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

      {/* Font Size Control */}
      <Card>
        <div className="border-b border-industrial-200 px-6 py-5 bg-industrial-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-primary/10">
                {/* Aa icon */}
                <svg className="h-5 w-5 text-accent-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-industrial-900">{isUrdu ? 'فونٹ سائز کنٹرول' : 'Font Size Control'}</h2>
                <p className="text-sm text-industrial-500">{isUrdu ? 'ٹیبل، ہیڈنگ اور باڈی ٹیکسٹ کا سائز الگ الگ کنٹرول کریں' : 'Control table, heading and body text sizes independently'}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={resetFs}
              className="flex items-center gap-1.5 rounded-lg border border-industrial-300 bg-white px-3 py-1.5 text-xs font-semibold text-industrial-600 hover:bg-industrial-100 transition-colors"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
              </svg>
              {isUrdu ? 'ڈیفالٹ' : 'Reset'}
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <FontSizeRow
            icon={
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>
              </svg>
            }
            label={isUrdu ? 'ٹیبل ٹیکسٹ' : 'Table Text'}
            desc={isUrdu ? 'تمام ٹیبلز کی قطاروں کا سائز' : 'Font size for all table rows'}
            color="blue"
            value={fs.table}
            onChange={setTableSize}
            preview={<span style={{ fontFamily: 'inherit' }}>Product &nbsp;|&nbsp; Qty &nbsp;|&nbsp; Price &nbsp;|&nbsp; Total</span>}
          />

          <div className="border-t border-industrial-100" />

          <FontSizeRow
            icon={
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 6h16M4 12h10M4 18h14"/>
              </svg>
            }
            label={isUrdu ? 'صفحہ ہیڈنگ' : 'Page Headings'}
            desc={isUrdu ? 'صفحے کے بڑے عنوانات' : 'h1, h2, h3 headings'}
            color="amber"
            value={fs.heading}
            onChange={setHeadingSize}
            preview={<strong style={{ fontFamily: 'inherit', fontWeight: 700 }}>Stock In &nbsp;·&nbsp; Sales &nbsp;·&nbsp; Dashboard</strong>}
          />

          <div className="border-t border-industrial-100" />

          <FontSizeRow
            icon={
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/>
              </svg>
            }
            label={isUrdu ? 'باڈی ٹیکسٹ' : 'Body Text'}
            desc={isUrdu ? 'لیبل، وضاحتیں اور فارم ٹیکسٹ' : 'Labels, descriptions and form text'}
            color="green"
            value={fs.body}
            onChange={setBodySize}
            preview={<span style={{ fontFamily: 'inherit' }}>Customer name &nbsp;·&nbsp; Enter username &nbsp;·&nbsp; Select dealer</span>}
          />
        </div>
      </Card>

    </div>
  );
}

// ─── FontSizeRow sub-component ────────────────────────────────────────────────

const STEPS: { value: SizeStep; label: string; px: string }[] = [
  { value: 'xs',   label: 'XS', px: '10px' },
  { value: 'sm',   label: 'S',  px: '12px' },
  { value: 'base', label: 'M',  px: '13px' },
  { value: 'lg',   label: 'L',  px: '15px' },
  { value: 'xl',   label: 'XL', px: '17px' },
];

const COLOR_MAP: Record<string, { ring: string; active: string; dot: string }> = {
  blue:  { ring: 'ring-blue-400',  active: 'bg-blue-600 text-white shadow-md',  dot: 'bg-blue-500' },
  amber: { ring: 'ring-amber-400', active: 'bg-amber-500 text-white shadow-md', dot: 'bg-amber-500' },
  green: { ring: 'ring-green-400', active: 'bg-green-600 text-white shadow-md', dot: 'bg-green-500' },
};

function FontSizeRow({
  icon, label, desc, color, value, onChange, preview,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  color: string;
  value: SizeStep;
  onChange: (v: SizeStep) => void;
  preview: React.ReactNode;
}) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.blue;
  const activeStep = STEPS.find((s) => s.value === value) ?? STEPS[2];

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
      {/* Label column */}
      <div className="flex min-w-[180px] items-center gap-3">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-industrial-100 text-industrial-500`}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-bold text-industrial-900">{label}</p>
          <p className="text-[11px] text-industrial-400">{desc}</p>
        </div>
      </div>

      {/* Step buttons */}
      <div className="flex items-center gap-1.5">
        {STEPS.map((step) => {
          const isActive = step.value === value;
          return (
            <button
              key={step.value}
              type="button"
              onClick={() => onChange(step.value)}
              title={step.px}
              className={`relative flex h-9 w-12 flex-col items-center justify-center rounded-xl border-2 text-xs font-bold transition-all duration-150 ${
                isActive
                  ? `${c.active} border-transparent ring-2 ${c.ring} ring-offset-1`
                  : 'border-industrial-200 bg-white text-industrial-600 hover:border-industrial-400 hover:bg-industrial-50'
              }`}
            >
              <span className="leading-none" style={{ fontSize: step.value === 'xs' ? '9px' : step.value === 'sm' ? '10px' : step.value === 'base' ? '11px' : step.value === 'lg' ? '13px' : '15px' }}>
                Aa
              </span>
              <span className="mt-0.5 text-[8px] font-black tracking-wider leading-none opacity-80">{step.label}</span>
              {isActive && <span className={`absolute -bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${c.dot}`} />}
            </button>
          );
        })}
      </div>

      {/* Live preview */}
      <div className="flex-1 rounded-xl border border-industrial-200 bg-industrial-50 px-4 py-2.5 min-w-0 overflow-hidden">
        <p className="text-[10px] font-bold uppercase tracking-wider text-industrial-400 mb-1">Preview · {activeStep.px}</p>
        <div className="text-industrial-700 truncate" style={{ fontSize: activeStep.px }}>
          {preview}
        </div>
      </div>
    </div>
  );
}

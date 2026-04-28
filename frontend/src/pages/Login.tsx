import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Eye, EyeOff, KeyRound, Lock, ShieldCheck, User, Warehouse, X } from 'lucide-react';
import { api, setAuthToken } from '../lib/api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Forgot password state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [fpStep, setFpStep] = useState<1 | 2 | 3>(1);
  const [fpUsername, setFpUsername] = useState('');
  const [fpPin, setFpPin] = useState('');
  const [fpNewPassword, setFpNewPassword] = useState('');
  const [fpConfirm, setFpConfirm] = useState('');
  const [fpShowNew, setFpShowNew] = useState(false);
  const [fpShowConfirm, setFpShowConfirm] = useState(false);
  const [fpLoading, setFpLoading] = useState(false);
  const [fpError, setFpError] = useState('');
  const [fpDone, setFpDone] = useState(false);

  const openForgot = () => {
    setForgotOpen(true);
    setFpStep(1);
    setFpUsername('');
    setFpPin('');
    setFpNewPassword('');
    setFpConfirm('');
    setFpError('');
    setFpDone(false);
    setFpLoading(false);
  };

  const closeForgot = () => setForgotOpen(false);

  const fpNextStep1 = () => {
    if (!fpUsername.trim()) { setFpError('Please enter your username'); return; }
    setFpError('');
    setFpStep(2);
  };

  const fpNextStep2 = async () => {
    if (!fpPin.trim()) { setFpError('Please enter your recovery PIN'); return; }
    setFpError('');
    setFpLoading(true);
    try {
      await api.post('/auth/verify-recovery-pin', { username: fpUsername, recoveryPin: fpPin });
      // PIN verified on server — safe to proceed
      setFpStep(3);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setFpError(typeof msg === 'string' ? msg : 'Incorrect PIN. Please try again.');
      setFpPin('');
    } finally {
      setFpLoading(false);
    }
  };

  const fpSubmit = async () => {
    if (!fpNewPassword || fpNewPassword.length < 6) {
      setFpError('Password must be at least 6 characters');
      return;
    }
    if (fpNewPassword !== fpConfirm) {
      setFpError('Passwords do not match');
      return;
    }
    setFpError('');
    setFpLoading(true);
    try {
      await api.post('/auth/reset-password', {
        username: fpUsername,
        recoveryPin: fpPin,
        newPassword: fpNewPassword,
      });
      setFpDone(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      const text = typeof msg === 'string' ? msg : 'Recovery failed. Check your username and PIN.';
      setFpError(text);
      if (text.toLowerCase().includes('pin')) {
        setFpStep(2);
        setFpPin('');
      }
    } finally {
      setFpLoading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { username, password });
      setAuthToken(data.token);
      localStorage.setItem('factory_pos_user', JSON.stringify(data.user));
      navigate('/dashboard');
    } catch {
      setError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-industrial-900">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center bg-industrial-950 px-16 text-white">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-accent-primary shadow-industrial-lg mb-8">
          <Warehouse className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">Zaki Cements and Steels</h1>
        <p className="text-lg text-industrial-400 text-center max-w-sm">
          Complete point-of-sale solution for steel and cement distribution businesses
        </p>
        <div className="mt-12 grid grid-cols-3 gap-8 text-center">
          <div>
            <p className="text-2xl font-bold text-accent-primary">Stock</p>
            <p className="text-sm text-industrial-500 mt-1">Inventory</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-accent-primary">Ledger</p>
            <p className="text-sm text-industrial-500 mt-1">Accounts</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-accent-primary">Reports</p>
            <p className="text-sm text-industrial-500 mt-1">Analytics</p>
          </div>
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center px-8 py-12 bg-industrial-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center mb-10">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-primary shadow-industrial-lg mb-4">
              <Warehouse className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-industrial-900">Zaki Cements and Steels</h1>
          </div>

          <div className="bg-white rounded-2xl shadow-industrial-lg border-2 border-industrial-200 p-10">
            <h2 className="text-3xl font-bold text-industrial-900 mb-2">Welcome back</h2>
            <p className="text-industrial-500 font-medium mb-8">Sign in to your account to continue</p>

            <form className="space-y-6" onSubmit={submit}>
              <div>
                <label className="mb-2 block text-sm font-bold text-industrial-700">Username</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <User className="h-5 w-5 text-industrial-400" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="h-12 w-full rounded-xl border-2 border-industrial-300 bg-industrial-50 pl-12 pr-4 text-sm font-medium focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 focus:outline-none transition-all duration-200 placeholder:text-industrial-400"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-industrial-700">Password</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <Lock className="h-5 w-5 text-industrial-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="h-12 w-full rounded-xl border-2 border-industrial-300 bg-industrial-50 pl-12 pr-12 text-sm font-medium focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 focus:outline-none transition-all duration-200 placeholder:text-industrial-400"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-industrial-400 hover:text-industrial-700 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-xl bg-accent-danger/10 border-2 border-accent-danger/20 px-4 py-3 text-sm font-semibold text-accent-danger">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-xl bg-accent-primary text-white font-bold text-sm transition-all duration-200 hover:bg-accent-primary/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-industrial focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:ring-offset-2 mt-2"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Signing in...
                  </span>
                ) : 'Sign In'}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={openForgot}
                  className="text-sm font-semibold text-accent-primary hover:text-accent-primary/80 transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
            </form>
          </div>

          <p className="text-center text-sm text-industrial-500 mt-6">
            Zaki Cements and Steels • All rights reserved
          </p>
        </div>
      </div>

      {/* ── Forgot Password Modal ── */}
      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-industrial-950/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border-2 border-industrial-200 p-8 relative">
            <button onClick={closeForgot} className="absolute top-4 right-4 text-industrial-400 hover:text-industrial-700 transition-colors">
              <X className="h-5 w-5" />
            </button>

            {/* Success */}
            {fpDone ? (
              <div className="flex flex-col items-center text-center py-4 gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle className="h-9 w-9 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-industrial-900">Password Reset!</h3>
                <p className="text-industrial-500 text-sm">Your password has been changed successfully. You can now sign in with your new password.</p>
                <button onClick={closeForgot} className="mt-2 h-11 w-full rounded-xl bg-accent-primary text-white font-bold text-sm hover:bg-accent-primary/90 transition-all">
                  Back to Sign In
                </button>
              </div>
            ) : (
              <>
                {/* Step indicator */}
                <div className="flex items-center justify-center gap-2 mb-6">
                  {([1, 2, 3] as const).map((s) => (
                    <div key={s} className="flex items-center gap-2">
                      <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                        fpStep === s ? 'bg-accent-primary text-white' :
                        fpStep > s ? 'bg-green-500 text-white' :
                        'bg-industrial-200 text-industrial-500'
                      }`}>
                        {fpStep > s ? <CheckCircle className="h-4 w-4" /> : s}
                      </div>
                      {s < 3 && <div className={`h-0.5 w-10 rounded-full ${fpStep > s ? 'bg-green-500' : 'bg-industrial-200'}`} />}
                    </div>
                  ))}
                </div>

                {/* Step 1: Username */}
                {fpStep === 1 && (
                  <>
                    <div className="flex justify-center mb-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-primary/10">
                        <User className="h-7 w-7 text-accent-primary" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-industrial-900 text-center mb-1">Forgot Password?</h3>
                    <p className="text-industrial-500 text-sm text-center mb-6">Enter your username to begin password recovery</p>
                    <div>
                      <label className="mb-2 block text-sm font-bold text-industrial-700">Username</label>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                          <User className="h-4 w-4 text-industrial-400" />
                        </div>
                        <input
                          type="text"
                          value={fpUsername}
                          onChange={(e) => setFpUsername(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && fpNextStep1()}
                          placeholder="Enter your username"
                          autoFocus
                          className="h-12 w-full rounded-xl border-2 border-industrial-300 bg-industrial-50 pl-10 pr-4 text-sm font-medium focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 focus:outline-none"
                        />
                      </div>
                    </div>
                    {fpError && <p className="mt-3 text-sm font-semibold text-accent-danger">{fpError}</p>}
                    <button onClick={fpNextStep1} className="mt-6 h-11 w-full rounded-xl bg-accent-primary text-white font-bold text-sm hover:bg-accent-primary/90 transition-all">
                      Continue
                    </button>
                  </>
                )}

                {/* Step 2: Recovery PIN */}
                {fpStep === 2 && (
                  <>
                    <div className="flex justify-center mb-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100">
                        <KeyRound className="h-7 w-7 text-amber-600" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-industrial-900 text-center mb-1">Enter Recovery PIN</h3>
                    <p className="text-industrial-500 text-sm text-center mb-1">
                      Enter the recovery PIN for <span className="font-bold text-industrial-700">{fpUsername}</span>.
                    </p>
                    <p className="text-xs text-industrial-400 text-center mb-6">Default PIN is <strong>1234</strong> if it was never changed.</p>
                    <div>
                      <label className="mb-2 block text-sm font-bold text-industrial-700">Recovery PIN</label>
                      <input
                        type="password"
                        inputMode="numeric"
                        value={fpPin}
                        onChange={(e) => setFpPin(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fpNextStep2()}
                        placeholder="● ● ● ●"
                        autoFocus
                        className="h-12 w-full rounded-xl border-2 border-industrial-300 bg-industrial-50 px-4 text-xl font-bold text-center tracking-widest focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 focus:outline-none"
                      />
                    </div>
                    {fpError && <p className="mt-3 text-sm font-semibold text-accent-danger">{fpError}</p>}
                    <div className="flex gap-3 mt-6">
                      <button onClick={() => { setFpStep(1); setFpError(''); setFpPin(''); }} className="h-11 flex-1 rounded-xl border-2 border-industrial-300 text-industrial-700 font-bold text-sm hover:bg-industrial-50 transition-all">
                        Back
                      </button>
                      <button onClick={fpNextStep2} disabled={fpLoading} className="h-11 flex-1 rounded-xl bg-accent-primary text-white font-bold text-sm hover:bg-accent-primary/90 transition-all disabled:opacity-50">
                        {fpLoading ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Verifying...
                          </span>
                        ) : 'Verify PIN'}
                      </button>
                    </div>
                  </>
                )}

                {/* Step 3: New password */}
                {fpStep === 3 && (
                  <>
                    <div className="flex justify-center mb-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100">
                        <ShieldCheck className="h-7 w-7 text-green-600" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-industrial-900 text-center mb-1">Set New Password</h3>
                    <p className="text-industrial-500 text-sm text-center mb-6">Choose a strong new password for your account</p>
                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-sm font-bold text-industrial-700">New Password</label>
                        <div className="relative">
                          <input
                            type={fpShowNew ? 'text' : 'password'}
                            value={fpNewPassword}
                            onChange={(e) => setFpNewPassword(e.target.value)}
                            placeholder="At least 6 characters"
                            autoFocus
                            className="h-12 w-full rounded-xl border-2 border-industrial-300 bg-industrial-50 pl-4 pr-12 text-sm font-medium focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 focus:outline-none"
                          />
                          <button type="button" onClick={() => setFpShowNew(v => !v)} className="absolute inset-y-0 right-0 flex items-center pr-4 text-industrial-400 hover:text-industrial-700">
                            {fpShowNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-bold text-industrial-700">Confirm Password</label>
                        <div className="relative">
                          <input
                            type={fpShowConfirm ? 'text' : 'password'}
                            value={fpConfirm}
                            onChange={(e) => setFpConfirm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fpSubmit()}
                            placeholder="Repeat new password"
                            className="h-12 w-full rounded-xl border-2 border-industrial-300 bg-industrial-50 pl-4 pr-12 text-sm font-medium focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 focus:outline-none"
                          />
                          <button type="button" onClick={() => setFpShowConfirm(v => !v)} className="absolute inset-y-0 right-0 flex items-center pr-4 text-industrial-400 hover:text-industrial-700">
                            {fpShowConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                    {fpError && <p className="mt-3 text-sm font-semibold text-accent-danger">{fpError}</p>}
                    <div className="flex gap-3 mt-6">
                      <button onClick={() => { setFpStep(2); setFpError(''); }} className="h-11 flex-1 rounded-xl border-2 border-industrial-300 text-industrial-700 font-bold text-sm hover:bg-industrial-50 transition-all">
                        Back
                      </button>
                      <button
                        onClick={fpSubmit}
                        disabled={fpLoading}
                        className="h-11 flex-1 rounded-xl bg-accent-primary text-white font-bold text-sm hover:bg-accent-primary/90 transition-all disabled:opacity-50"
                      >
                        {fpLoading ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Resetting...
                          </span>
                        ) : 'Reset Password'}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

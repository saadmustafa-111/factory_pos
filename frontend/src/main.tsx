import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { LangProvider } from './lib/i18n';
import { FontSizeProvider } from './lib/font-size';
import './index.css';

// ─── BACKEND GATE ─────────────────────────────────────────────────────────────
// Shows a loading screen until the in-process NestJS backend is ready.
// In development (Vite dev server + separate NestJS watch process) the gate is
// bypassed so hot-reload is instant — the backend is assumed to be up already.

const IS_ELECTRON = typeof window !== 'undefined' && !!(window as any).factoryPos;

type GateStatus = 'loading' | 'ready' | 'error';

function BackendGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<GateStatus>(
    import.meta.env.DEV || !IS_ELECTRON ? 'ready' : 'loading',
  );
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (import.meta.env.DEV || !IS_ELECTRON) return;
    const fp = (window as any).factoryPos;
    const cleanReady = fp.onBackendReady(() => setStatus('ready'));
    const cleanError = fp.onBackendError((msg: string) => {
      setErrorMsg(msg);
      setStatus('error');
    });
    return () => { cleanReady(); cleanError(); };
  }, []);

  if (status === 'loading') {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100vh', background: '#0f172a',
        color: '#f8fafc', fontFamily: 'sans-serif', gap: '16px',
      }}>
        <div style={{ fontSize: '24px', fontWeight: 600 }}>Steel &amp; Cement POS</div>
        <div style={{ fontSize: '14px', color: '#94a3b8' }}>Starting POS system...</div>
        <div style={{
          width: '220px', height: '4px', background: '#1e293b',
          borderRadius: '2px', overflow: 'hidden', marginTop: '8px',
        }}>
          <div style={{
            height: '100%', width: '40%', background: '#3b82f6', borderRadius: '2px',
            animation: 'pos-slide 1.4s ease-in-out infinite',
          }} />
        </div>
        <style>{`@keyframes pos-slide{0%{transform:translateX(-150%)}100%{transform:translateX(600%)}}`}</style>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100vh', background: '#0f172a',
        color: '#f8fafc', fontFamily: 'sans-serif', gap: '12px',
      }}>
        <div style={{ fontSize: '20px', fontWeight: 600, color: '#ef4444' }}>⚠ Failed to Start</div>
        <div style={{ fontSize: '14px', color: '#94a3b8', maxWidth: '400px', textAlign: 'center' }}>
          {errorMsg || 'The backend server failed to start. Please restart the application.'}
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: '16px', padding: '8px 24px', background: '#3b82f6',
            color: '#fff', border: 'none', borderRadius: '6px',
            cursor: 'pointer', fontSize: '14px',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

// ─── ENTRY POINT ──────────────────────────────────────────────────────────────

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <LangProvider>
      <FontSizeProvider>
        <HashRouter>
          <BackendGate>
            <App />
          </BackendGate>
        </HashRouter>
      </FontSizeProvider>
    </LangProvider>
  </React.StrictMode>,
);

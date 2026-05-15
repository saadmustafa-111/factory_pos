import { useEffect, useMemo, useRef, useState } from 'react';
import { Calculator as CalcIcon, Delete, History, MoreVertical, RotateCcw, Trash2, X } from 'lucide-react';
import { Card } from '../components/ui/card';
import { useLang } from '../lib/i18n.tsx';

type Operator = '+' | '-' | '*' | '/';
type HistoryEntry = {
  expression: string;
  result: string;
};

const HISTORY_STORAGE_KEY = 'factory-pos-calculator-history';

function operatorLabel(operator: Operator): string {
  return operator === '*' ? 'x' : operator === '/' ? '÷' : operator;
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return 'Error';
  return Number(value.toFixed(10)).toString();
}

function calculate(left: number, right: number, op: Operator): number {
  if (op === '+') return left + right;
  if (op === '-') return left - right;
  if (op === '*') return left * right;
  if (right === 0) return NaN;
  return left / right;
}

export default function CalculatorPage() {
  const { isUrdu } = useLang();

  const [current, setCurrent] = useState('0');
  const [previous, setPrevious] = useState<number | null>(null);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [overwrite, setOverwrite] = useState(true);
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = window.localStorage.getItem(HISTORY_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as HistoryEntry[]) : [];
    } catch {
      return [];
    }
  });

  // UI state (must be above useEffect)
  const [menuOpen, setMenuOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Keyboard support
  useEffect(() => {
    if (historyOpen) return; // Don't handle keys when history overlay is open
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key;
      if (key >= '0' && key <= '9') {
        inputDigit(key);
        e.preventDefault();
      } else if (key === '.' || key === ',') {
        inputDot();
        e.preventDefault();
      } else if (key === '+' || key === '-' || key === '*' || key === '/') {
        pickOperator(key as Operator);
        e.preventDefault();
      } else if (key === 'Enter' || key === '=') {
        equals();
        e.preventDefault();
      } else if (key === 'Backspace') {
        backspace();
        e.preventDefault();
      } else if (key === 'Escape') {
        clearAll();
        e.preventDefault();
      } else if (key === '%') {
        percent();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [current, operator, previous, overwrite, historyOpen]);
    

  // UI state
  // (already declared above)

  useEffect(() => {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  // Close menu when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const expression = useMemo(() => {
    if (previous == null || !operator) return '';
    return `${formatNumber(previous)} ${operatorLabel(operator)}`;
  }, [previous, operator]);

  const liveResult = useMemo(() => {
    if (previous == null || !operator || overwrite) return null;
    return formatNumber(calculate(previous, Number(current), operator));
  }, [current, operator, overwrite, previous]);

  const inputDigit = (digit: string) => {
    if (overwrite) { setCurrent(digit); setOverwrite(false); return; }
    if (current === '0') { setCurrent(digit); return; }
    if (current.length >= 18) return;
    setCurrent((v) => v + digit);
  };

  const inputDot = () => {
    if (overwrite) { setCurrent('0.'); setOverwrite(false); return; }
    if (!current.includes('.')) setCurrent((v) => `${v}.`);
  };

  const clearAll = () => {
    setCurrent('0'); setPrevious(null); setOperator(null); setOverwrite(true);
  };

  const backspace = () => {
    if (overwrite) return;
    if (current.length <= 1 || (current.length === 2 && current.startsWith('-'))) {
      setCurrent('0'); setOverwrite(true); return;
    }
    setCurrent((v) => v.slice(0, -1));
  };

  const toggleSign = () => {
    if (current === '0') return;
    setCurrent((v) => (v.startsWith('-') ? v.slice(1) : `-${v}`));
  };

  const percent = () => {
    setCurrent(formatNumber(Number(current) / 100));
    setOverwrite(true);
  };

  const saveHistory = (left: number, right: number, op: Operator, result: number) => {
    setHistory((items) => [{
      expression: `${formatNumber(left)} ${operatorLabel(op)} ${formatNumber(right)}`,
      result: formatNumber(result),
    }, ...items]);
  };

  const pickOperator = (op: Operator) => {
    const now = Number(current);
    if (previous == null) {
      setPrevious(now); setOperator(op); setOverwrite(true); return;
    }
    if (operator && !overwrite) {
      const result = calculate(previous, now, operator);
      saveHistory(previous, now, operator, result);
      setPrevious(result);
      setCurrent(formatNumber(result));
    }
    setOperator(op); setOverwrite(true);
  };

  const equals = () => {
    if (previous == null || !operator) return;
    const right = Number(current);
    const result = calculate(previous, right, operator);
    saveHistory(previous, right, operator, result);
    setCurrent(formatNumber(result));
    setPrevious(null); setOperator(null); setOverwrite(true);
  };

  const clearHistory = () => {
    setHistory([]);
    window.localStorage.removeItem(HISTORY_STORAGE_KEY);
  };

  const buttonBase =
    'h-14 rounded-xl text-lg font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-accent-primary/40';

  return (
    <div className={`space-y-6 ${isUrdu ? 'font-urdu' : ''}`}>
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-primary/15">
          <CalcIcon className="h-6 w-6 text-accent-primary" />
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-industrial-900">{isUrdu ? 'کیلکولیٹر' : 'Calculator'}</h2>
          <p className="text-sm text-industrial-500">
            {isUrdu ? 'روزمرہ حساب کے لئے مکمل کیلکولیٹر' : 'Quick and full calculator for daily calculations'}
          </p>
        </div>
        {/* Three-dot menu */}
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-industrial-400 hover:bg-industrial-100 hover:text-industrial-700 transition-colors"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-11 z-20 min-w-[160px] rounded-xl border border-industrial-200 bg-white py-1 shadow-xl">
              <button
                type="button"
                onClick={() => { setMenuOpen(false); setHistoryOpen(true); }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-industrial-700 hover:bg-industrial-50 transition-colors"
              >
                <History className="h-4 w-4" />
                {isUrdu ? 'ہسٹری' : 'History'}
                {history.length > 0 && (
                  <span className="ml-auto rounded-full bg-accent-primary/15 px-1.5 py-0.5 text-xs font-semibold text-accent-primary">
                    {history.length}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      <Card className="mx-auto max-w-sm p-5 sm:p-6">
        {/* Display */}
        <div className="mb-5 rounded-2xl border-2 border-industrial-200 bg-industrial-900 px-4 py-4 sm:px-5">
          <p className="h-5 text-right text-sm text-industrial-300">{expression || '\u00A0'}</p>
          <p className="mt-1 truncate text-right text-4xl font-bold text-white">{current}</p>
          {liveResult !== null && (
            <p className="mt-2 text-right text-sm text-emerald-400 opacity-80">= {liveResult}</p>
          )}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-4 gap-3">
          <button type="button" onClick={clearAll} className={`${buttonBase} bg-red-100 text-red-700 hover:bg-red-200`}>AC</button>
          <button type="button" onClick={toggleSign} className={`${buttonBase} bg-industrial-100 text-industrial-700 hover:bg-industrial-200`}>+/-</button>
          <button type="button" onClick={percent} className={`${buttonBase} bg-industrial-100 text-industrial-700 hover:bg-industrial-200`}>%</button>
          <button type="button" onClick={() => pickOperator('/')} className={`${buttonBase} bg-accent-primary/15 text-accent-primary hover:bg-accent-primary/25`}>÷</button>

          {[7, 8, 9].map((n) => (
            <button key={n} type="button" onClick={() => inputDigit(String(n))} className={`${buttonBase} border-2 border-industrial-200 bg-white text-industrial-900 hover:bg-industrial-50`}>{n}</button>
          ))}
          <button type="button" onClick={() => pickOperator('*')} className={`${buttonBase} bg-accent-primary/15 text-accent-primary hover:bg-accent-primary/25`}>x</button>

          {[4, 5, 6].map((n) => (
            <button key={n} type="button" onClick={() => inputDigit(String(n))} className={`${buttonBase} border-2 border-industrial-200 bg-white text-industrial-900 hover:bg-industrial-50`}>{n}</button>
          ))}
          <button type="button" onClick={() => pickOperator('-')} className={`${buttonBase} bg-accent-primary/15 text-accent-primary hover:bg-accent-primary/25`}>-</button>

          {[1, 2, 3].map((n) => (
            <button key={n} type="button" onClick={() => inputDigit(String(n))} className={`${buttonBase} border-2 border-industrial-200 bg-white text-industrial-900 hover:bg-industrial-50`}>{n}</button>
          ))}
          <button type="button" onClick={() => pickOperator('+')} className={`${buttonBase} bg-accent-primary/15 text-accent-primary hover:bg-accent-primary/25`}>+</button>

          <button type="button" onClick={backspace} className={`${buttonBase} bg-industrial-100 text-industrial-700 hover:bg-industrial-200`}>
            <Delete className="mx-auto h-6 w-6" />
          </button>
          <button type="button" onClick={() => inputDigit('0')} className={`${buttonBase} border-2 border-industrial-200 bg-white text-industrial-900 hover:bg-industrial-50`}>0</button>
          <button type="button" onClick={inputDot} className={`${buttonBase} border-2 border-industrial-200 bg-white text-industrial-900 hover:bg-industrial-50`}>.</button>
          <button type="button" onClick={equals} className={`${buttonBase} bg-green-600 text-white hover:bg-green-700`}>=</button>
        </div>

        <button type="button" onClick={clearAll} className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-industrial-500 hover:text-industrial-700">
          <RotateCcw className="h-4 w-4" />
          {isUrdu ? 'دوبارہ شروع کریں' : 'Reset'}
        </button>
      </Card>

      {/* History overlay panel */}
      {historyOpen && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end sm:items-center sm:justify-center" onClick={() => setHistoryOpen(false)}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Panel */}
          <div
            className="relative z-10 w-full max-w-sm rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar (mobile) */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="h-1 w-10 rounded-full bg-industrial-200" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-industrial-100">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-accent-primary" />
                <h3 className="text-lg font-bold text-industrial-900">{isUrdu ? 'ہسٹری' : 'History'}</h3>
                {history.length > 0 && (
                  <span className="rounded-full bg-accent-primary/15 px-2 py-0.5 text-xs font-semibold text-accent-primary">{history.length}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={clearHistory}
                    className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {isUrdu ? 'صاف کریں' : 'Clear'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setHistoryOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-industrial-400 hover:bg-industrial-100 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Entries */}
            <div className="max-h-[60vh] overflow-y-auto px-5 py-4 space-y-3">
              {history.length === 0 ? (
                <div className="rounded-xl border border-dashed border-industrial-200 bg-industrial-50 py-10 text-center">
                  <History className="mx-auto h-8 w-8 text-industrial-300 mb-2" />
                  <p className="text-sm text-industrial-400">{isUrdu ? 'ابھی تک کوئی ہسٹری نہیں' : 'No history yet'}</p>
                </div>
              ) : (
                history.map((item, index) => (
                  <div
                    key={`${item.expression}-${index}`}
                    className="flex items-center justify-between rounded-xl border border-industrial-100 bg-industrial-50 px-4 py-3"
                  >
                    <p className="text-sm text-industrial-500">{item.expression}</p>
                    <p className="text-base font-bold text-industrial-900 ml-4">= {item.result}</p>
                  </div>
                ))
              )}
            </div>

            {/* Bottom safe area */}
            <div className="h-safe-bottom pb-4" />
          </div>
        </div>
      )}
    </div>
  );
}

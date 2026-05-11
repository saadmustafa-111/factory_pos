import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export type SizeStep = 'xs' | 'sm' | 'base' | 'lg' | 'xl';

export interface FontSizeSettings {
  table: SizeStep;
  heading: SizeStep;
  body: SizeStep;
}

interface FontSizeContextValue {
  settings: FontSizeSettings;
  setTableSize: (v: SizeStep) => void;
  setHeadingSize: (v: SizeStep) => void;
  setBodySize: (v: SizeStep) => void;
  reset: () => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULTS: FontSizeSettings = { table: 'base', heading: 'base', body: 'base' };
const LS_KEY = 'pos_font_sizes';

// ─── DOM application ─────────────────────────────────────────────────────────

function applyToDOM(s: FontSizeSettings) {
  const root = document.documentElement;
  root.setAttribute('data-table-size', s.table);
  root.setAttribute('data-heading-size', s.heading);
  root.setAttribute('data-body-size', s.body);
}

// ─── Context ─────────────────────────────────────────────────────────────────

const FontSizeContext = createContext<FontSizeContextValue | null>(null);

export function FontSizeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<FontSizeSettings>(() => {
    try {
      const stored = localStorage.getItem(LS_KEY);
      return stored ? { ...DEFAULTS, ...JSON.parse(stored) } : DEFAULTS;
    } catch {
      return DEFAULTS;
    }
  });

  // Apply to DOM and persist whenever settings change
  useEffect(() => {
    applyToDOM(settings);
    localStorage.setItem(LS_KEY, JSON.stringify(settings));
  }, [settings]);

  const setTableSize = (table: SizeStep) => setSettings((s) => ({ ...s, table }));
  const setHeadingSize = (heading: SizeStep) => setSettings((s) => ({ ...s, heading }));
  const setBodySize = (body: SizeStep) => setSettings((s) => ({ ...s, body }));
  const reset = () => setSettings(DEFAULTS);

  return (
    <FontSizeContext.Provider value={{ settings, setTableSize, setHeadingSize, setBodySize, reset }}>
      {children}
    </FontSizeContext.Provider>
  );
}

export function useFontSize() {
  const ctx = useContext(FontSizeContext);
  if (!ctx) throw new Error('useFontSize must be used within FontSizeProvider');
  return ctx;
}

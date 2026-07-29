import {
  BarChart3,
  BookOpen,
  Boxes,
  Building2,
  Calculator,
  Camera,
  DatabaseBackup,
  Languages,
  LayoutDashboard,
  LogOut,
  NotebookPen,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Tag,
  Truck,
  Users,
  Wallet,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { clearAuthToken } from '../../lib/api';
import { useLang } from '../../lib/i18n';
import { useFontSize } from '../../lib/font-size';

function useImageUpload(key: string) {
  const [image, setImage] = useState<string>(() => localStorage.getItem(key) ?? '');
  const inputRef = useRef<HTMLInputElement>(null);
  const pick = () => inputRef.current?.click();
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImage(result);
      localStorage.setItem(key, result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };
  const remove = () => { setImage(''); localStorage.removeItem(key); };
  return { image, pick, remove, inputRef, handleFile };
}

export function AppShell() {
  const loc = useLocation();
  const navigate = useNavigate();
  const { t, lang, setLang, isUrdu } = useLang();
  const { settings: fs } = useFontSize();
  const logo = useImageUpload('pos_logo_image');
  const avatar = useImageUpload('pos_avatar_image');

  const SIDEBAR_PX: Record<string, string> = {
    xs: '11px', sm: '12px', base: '14px', lg: '15px', xl: '17px',
  };

  const nav = [
    { to: '/dashboard', label: t.dashboard, icon: LayoutDashboard },
    { to: '/inventory', label: t.inventory, icon: Boxes },
    { to: '/sales', label: t.sales, icon: ShoppingCart },
    { to: '/customers', label: t.customers, icon: Users },
    { to: '/customer-ledger', label: isUrdu ? 'کسٹمر کھاتہ' : 'Customer Ledger', icon: Users },
    { to: '/udhar-book', label: isUrdu ? 'اُدھار بُک' : 'Credit Book', icon: BookOpen },
    { to: '/daily-register', label: t.dailyRegister, icon: Receipt },
    { to: '/mill-ledger', label: isUrdu ? 'ڈیلر کھاتہ' : 'Dealer Ledger', icon: Building2 },
    { to: '/advance-payments', label: t.advancePayments, icon: Package },
    { to: '/suppliers', label: isUrdu ? 'ڈیلرز' : 'Add Dealers', icon: Truck },
    { to: '/products', label: isUrdu ? 'پروڈکٹس' : 'Products', icon: Tag },
    { to: '/expenses', label: t.expenses, icon: Wallet },
    { to: '/notepad', label: isUrdu ? 'نوٹ پیڈ' : 'Notepad', icon: NotebookPen },
    { to: '/calculator', label: isUrdu ? 'کیلکولیٹر' : 'Calculator', icon: Calculator },
    { to: '/reports', label: t.reports, icon: BarChart3 },
    { to: '/settings', label: t.settings, icon: Settings },
    { to: '/backup', label: t.backupRestore, icon: DatabaseBackup },
  ];

  const logout = () => {
    clearAuthToken();
    localStorage.removeItem('factory_pos_user');
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-industrial-50">
      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 z-40 flex h-screen w-64 flex-col industrial-sidebar ${isUrdu ? 'order-last right-0 left-auto' : ''}`}>
        {/* Logo */}
        <div className="flex flex-col gap-3 border-b border-industrial-700 px-4 py-4">
          <div className="flex items-center gap-3">
            {/* Warehouse / dealer shop logo mark */}
            <input ref={logo.inputRef} type="file" accept="image/*" className="hidden" onChange={logo.handleFile} />
            <button
              onClick={logo.pick}
              title="Click to upload logo"
              className="group relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl shadow-xl overflow-hidden focus:outline-none"
              style={{ background: 'linear-gradient(160deg, #1e293b 0%, #0f172a 100%)', border: '1px solid rgba(251,191,36,0.3)' }}
            >
              {logo.image ? (
                <img src={logo.image} alt="logo" className="h-full w-full object-cover" />
              ) : (
                <svg viewBox="0 0 44 44" className="h-10 w-10" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 20 L22 6 L40 20" stroke="#fbbf24" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round"/>
                  <rect x="6" y="20" width="32" height="18" fill="none" stroke="#e2e8f0" strokeWidth="1.6"/>
                  <rect x="6" y="20" width="3" height="18" fill="#e2e8f0" fillOpacity="0.9"/>
                  <rect x="35" y="20" width="3" height="18" fill="#e2e8f0" fillOpacity="0.9"/>
                  <rect x="20.5" y="20" width="3" height="18" fill="#94a3b8" fillOpacity="0.5"/>
                  <rect x="10" y="24" width="7" height="5" rx="0.5" fill="none" stroke="#94a3b8" strokeWidth="1.2"/>
                  <rect x="27" y="24" width="7" height="5" rx="0.5" fill="none" stroke="#94a3b8" strokeWidth="1.2"/>
                  <rect x="17" y="30" width="10" height="8" fill="#fbbf24" fillOpacity="0.15" stroke="#fbbf24" strokeWidth="1.2"/>
                  <line x1="22" y1="30" x2="22" y2="38" stroke="#fbbf24" strokeWidth="0.8"/>
                  <line x1="6" y1="29.5" x2="38" y2="29.5" stroke="#475569" strokeWidth="0.8"/>
                </svg>
              )}
              {/* Hover overlay */}
              <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="h-5 w-5 text-white" />
              </span>
            </button>
            <div className="min-w-0 flex-1">
              <p className={`text-[13.5px] font-black leading-snug tracking-wide text-white ${isUrdu ? 'font-urdu' : ''}`}>
                Haji Kala Khan Son's
              </p>
              <p className={`text-[10.5px] font-bold leading-tight tracking-[0.15em] text-amber-400 uppercase mt-0.5 whitespace-nowrap ${isUrdu ? 'font-urdu' : ''}`}>
                Cement Steel Dealer
              </p>
            </div>
          </div>
          {/* Owner badge */}
          <div className="flex items-center gap-2.5 rounded-lg border border-white/10 px-3 py-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <input ref={avatar.inputRef} type="file" accept="image/*" className="hidden" onChange={avatar.handleFile} />
            <button
              onClick={avatar.pick}
              title="Click to upload profile photo"
              className="group relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/20 ring-1 ring-amber-400/40 overflow-hidden focus:outline-none"
            >
              {avatar.image ? (
                <img src={avatar.image} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="text-[10px] font-black text-amber-400">Z</span>
              )}
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="h-3 w-3 text-white" />
              </span>
            </button>
            <div className="min-w-0">
              <p className={`text-[12px] font-bold text-white leading-none ${isUrdu ? 'font-urdu' : ''}`}>
                Zakaullah Masood
              </p>
              <p className="text-[10px] text-industrial-400 mt-0.5">Proprietor</p>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 space-y-2 px-4 py-6 overflow-y-auto">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = loc.pathname.startsWith(item.to);
            const isSuppliers = item.to === '/suppliers';
            if (isSuppliers) {
              return (
                <div
                  key={item.to}
                  style={{ fontSize: SIDEBAR_PX[fs.sidebar] }}
                  className={`flex items-center gap-3 rounded-lg font-medium transition-all duration-200 ${active ? 'industrial-sidebar-item-active' : 'industrial-sidebar-item'} ${isUrdu ? 'flex-row-reverse font-urdu text-base' : ''}`}
                >
                  <Link to={item.to} className="flex flex-1 items-center gap-3 px-4 py-3">
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                  
                </div>
              );
            }
            return (
              <Link
                key={item.to}
                to={item.to}
                style={{ fontSize: SIDEBAR_PX[fs.sidebar] }}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 font-medium transition-all duration-200 ${
                  active ? 'industrial-sidebar-item-active' : 'industrial-sidebar-item'
                } ${isUrdu ? 'flex-row-reverse font-urdu text-base' : ''}`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Language toggle + logout */}
        <div className="border-t border-industrial-700 p-4 space-y-3">
          {/* Language toggle */}
          <button
            onClick={() => setLang(lang === 'en' ? 'ur' : 'en')}
            style={{ fontSize: SIDEBAR_PX[fs.sidebar] }}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 industrial-sidebar-item transition-all duration-200"
          >
            <Languages className="h-5 w-5 shrink-0" />
            <span className={isUrdu ? 'font-urdu' : ''}>
              {lang === 'en' ? '🇵🇰 اردو' : '🇬🇧 English'}
            </span>
          </button>
          {/* Logout */}
          <button
            onClick={logout}
            style={{ fontSize: SIDEBAR_PX[fs.sidebar] }}
            className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 transition-all duration-200 hover:bg-red-600/20 hover:text-red-300 ${isUrdu ? 'flex-row-reverse' : ''}`}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span className={isUrdu ? 'font-urdu' : ''}>{t.logout}</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className={`flex flex-1 flex-col ${isUrdu ? 'mr-64' : 'ml-64'}`}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-industrial-200 bg-white px-8 shadow-industrial">
          <div className="flex items-center gap-4">
            <h1 className={`text-xl font-bold text-industrial-900 ${isUrdu ? 'font-urdu' : ''}`}>
              {nav.find((n) => loc.pathname.startsWith(n.to))?.label ?? t.appName}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-industrial-500 font-medium">
              {new Date().toLocaleDateString(isUrdu ? 'ur-PK' : 'en-PK', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              })}
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-industrial-50">
          <div className="p-8">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}

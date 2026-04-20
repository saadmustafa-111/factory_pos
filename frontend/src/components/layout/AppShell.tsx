import {
  BarChart3,
  Boxes,
  Building2,
  Languages,
  LayoutDashboard,
  LogOut,
  Receipt,
  Settings,
  ShoppingCart,
  Users,
} from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { clearAuthToken } from '../../lib/api';
import { useLang } from '../../lib/i18n';

export function AppShell() {
  const loc = useLocation();
  const navigate = useNavigate();
  const { t, lang, setLang, isUrdu } = useLang();

  const nav = [
    { to: '/dashboard', label: t.dashboard, icon: LayoutDashboard },
    { to: '/inventory', label: t.inventory, icon: Boxes },
    { to: '/sales', label: t.sales, icon: ShoppingCart },
    { to: '/customer-ledger', label: t.customerLedger, icon: Users },
    { to: '/mill-ledger', label: t.millLedger, icon: Building2 },
    { to: '/reports', label: t.reports, icon: BarChart3 },
    { to: '/settings', label: t.settings, icon: Settings },
  ];

  const logout = () => {
    clearAuthToken();
    localStorage.removeItem('factory_pos_user');
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-[#F8F9FA]">
      {/* Sidebar */}
      <aside className={`flex h-screen w-60 flex-col bg-[#1A1F2E] text-white ${isUrdu ? 'order-last' : ''}`}>
        {/* Logo */}
        <div className="flex items-center gap-3 border-b border-slate-700 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2563EB]">
            <Receipt className="h-5 w-5 text-white" />
          </div>
          <span className={`text-base font-bold ${isUrdu ? 'font-urdu' : ''}`}>{t.appName}</span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = loc.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[#2563EB] text-white shadow-sm'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                } ${isUrdu ? 'flex-row-reverse font-urdu text-base' : ''}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Language toggle + logout */}
        <div className="border-t border-slate-700 p-3 space-y-2">
          {/* Language toggle */}
          <button
            onClick={() => setLang(lang === 'en' ? 'ur' : 'en')}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Languages className="h-4 w-4 shrink-0" />
            <span className={isUrdu ? 'font-urdu' : ''}>
              {lang === 'en' ? '🇵🇰 اردو' : '🇬🇧 English'}
            </span>
          </button>
          {/* Logout */}
          <button
            onClick={logout}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-red-600/30 hover:text-red-300 transition-colors ${isUrdu ? 'flex-row-reverse' : ''}`}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className={isUrdu ? 'font-urdu' : ''}>{t.logout}</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 items-center justify-between border-b border-slate-100 bg-white px-6 shadow-sm">
          <span className={`font-semibold text-slate-700 ${isUrdu ? 'font-urdu' : ''}`}>
            {nav.find((n) => loc.pathname.startsWith(n.to))?.label ?? t.appName}
          </span>
          <span className="text-xs text-slate-400">
            {new Date().toLocaleDateString(isUrdu ? 'ur-PK' : 'en-PK', {
              weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
            })}
          </span>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

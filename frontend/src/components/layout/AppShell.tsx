import {
  BarChart3,
  BookOpen,
  Boxes,
  Building2,
  DatabaseBackup,
  Languages,
  LayoutDashboard,
  LogOut,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Users,
  Wallet,
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
    { to: '/customers', label: t.customers, icon: Users },
    { to: '/udhar-book', label: isUrdu ? 'اُدھار بُک' : 'Udhar Book', icon: BookOpen },
    { to: '/daily-register', label: t.dailyRegister, icon: Receipt },
    { to: '/mill-ledger', label: t.millLedger, icon: Building2 },
    { to: '/advance-payments', label: t.advancePayments, icon: Package },
    { to: '/expenses', label: t.expenses, icon: Wallet },
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
        <div className="flex items-center gap-3 border-b border-industrial-700 px-6 py-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-primary shadow-industrial">
            <Receipt className="h-6 w-6 text-white" />
          </div>
          <span className={`text-lg font-bold ${isUrdu ? 'font-urdu' : ''}`}>{t.appName}</span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 space-y-2 px-4 py-6 overflow-y-auto">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = loc.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'industrial-sidebar-item-active'
                    : 'industrial-sidebar-item'
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
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm industrial-sidebar-item transition-all duration-200"
          >
            <Languages className="h-5 w-5 shrink-0" />
            <span className={isUrdu ? 'font-urdu' : ''}>
              {lang === 'en' ? '🇵🇰 اردو' : '🇬🇧 English'}
            </span>
          </button>
          {/* Logout */}
          <button
            onClick={logout}
            className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm transition-all duration-200 hover:bg-red-600/20 hover:text-red-300 ${isUrdu ? 'flex-row-reverse' : ''}`}
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

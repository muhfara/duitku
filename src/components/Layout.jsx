import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard, ArrowLeftRight, PieChart,
  ScanLine, Wallet, PiggyBank, ChevronRight, Settings,
  CreditCard, Moon, Sun, Languages, Tag,
} from 'lucide-react';
import logoFull from '../assets/logo-full.svg';

// ── Mobile bottom nav: 5 tab groups ──────────────────────────────────────────
const TAB_GROUPS = [
  {
    id: 'home',
    root: '/',
    icon: LayoutDashboard,
    labelId: 'Beranda',
    labelEn: 'Home',
    paths: ['/'],
  },
  {
    id: 'transaksi',
    root: '/transactions',
    icon: ArrowLeftRight,
    labelId: 'Transaksi',
    labelEn: 'Trx',
    paths: ['/transactions', '/scan'],
    sub: [
      { path: '/transactions', labelId: 'Transaksi',  labelEn: 'Transactions' },
      { path: '/scan',         labelId: 'Scan Bon',   labelEn: 'Scan' },
    ],
  },
  {
    id: 'simpanan',
    root: '/wallets',
    icon: Wallet,
    labelId: 'Simpanan',
    labelEn: 'Wallet',
    paths: ['/wallets', '/savings', '/debts'],
    sub: [
      { path: '/wallets',  labelId: 'Dompet',   labelEn: 'Wallets' },
      { path: '/savings',  labelId: 'Tabungan', labelEn: 'Savings' },
      { path: '/debts',    labelId: 'Hutang',   labelEn: 'Debts' },
    ],
  },
  {
    id: 'laporan',
    root: '/reports',
    icon: PieChart,
    labelId: 'Laporan',
    labelEn: 'Reports',
    paths: ['/reports', '/budget', '/categories'],
    sub: [
      { path: '/reports',    labelId: 'Laporan',  labelEn: 'Reports' },
      { path: '/budget',     labelId: 'Anggaran', labelEn: 'Budget' },
      { path: '/categories', labelId: 'Kategori', labelEn: 'Category' },
    ],
  },
  {
    id: 'profil',
    root: '/profile',
    icon: null, // uses avatar initial instead
    labelId: 'Profil',
    labelEn: 'Profile',
    paths: ['/profile'],
  },
];

// ── Desktop sidebar nav items ─────────────────────────────────────────────────
const SIDEBAR_ITEMS = [
  { path: '/',             key: 'dashboard',        icon: LayoutDashboard },
  { path: '/transactions', key: 'transactions',     icon: ArrowLeftRight },
  { path: '/wallets',      key: 'wallets',          icon: Wallet },
  { path: '/savings',      key: 'savings',          icon: PiggyBank },
  { path: '/debts',        key: 'debts',            icon: CreditCard },
  { path: '/budget',       key: 'budget',           icon: PieChart },
  { path: '/categories',   key: 'manageCategories', icon: Tag },
  { path: '/reports',      key: 'reports',          icon: PieChart },
  { path: '/scan',         key: 'scan',             icon: ScanLine },
];

export default function Layout({ children }) {
  const { user, darkMode, toggleDark, toggleLang, lang, t } = useApp();
  const location = useLocation();

  // Current page label for the header
  const allPages = [
    ...SIDEBAR_ITEMS.map(({ path, key }) => ({ path, label: t(key) })),
    { path: '/profile', label: t('profile') },
  ];
  const currentLabel = allPages.find(p => p.path === location.pathname)?.label ?? 'DuitKu';

  // Determine which tab group the current page belongs to
  const activeGroup = TAB_GROUPS.find(g => g.paths.includes(location.pathname));
  const showSubNav = activeGroup?.sub && activeGroup.sub.length > 1;

  const isGroupActive = (group) => group.paths.includes(location.pathname);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">

      {/* ── Desktop-only sidebar ─────────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <img src={logoFull} alt="DuitKu" className="h-9 dark:brightness-90" />
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {SIDEBAR_ITEMS.map(({ path, key, icon: Icon }) => {
            const active = location.pathname === path;
            return (
              <Link key={path} to={path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${active
                    ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}>
                <Icon size={18} />
                {t(key)}
                {active && <ChevronRight size={14} className="ml-auto" />}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-gray-100 dark:border-gray-700">
          <Link to="/profile"
            className={`flex items-center gap-3 w-full rounded-xl p-2 transition-colors
              ${location.pathname === '/profile'
                ? 'bg-green-50 dark:bg-green-900/30'
                : 'hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}>
            <div className="w-9 h-9 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
              {(user?.email?.[0] ?? '?').toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                {user?.profile?.name ?? user?.email?.split('@')[0] ?? 'User'}
              </p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
            <Settings size={14} className="text-gray-400 flex-shrink-0" />
          </Link>
        </div>
      </aside>

      {/* ── Main content column ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-3 lg:px-6">
          {/* Mobile: show logo; Desktop: show page title */}
          <img src={logoFull} alt="DuitKu" className="lg:hidden h-7 dark:brightness-90" />
          <h1 className="hidden lg:block text-lg font-semibold text-gray-800 dark:text-gray-100 flex-1 truncate">
            {currentLabel}
          </h1>
          <span className="flex-1 lg:hidden" />

          <button onClick={toggleLang}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <Languages size={14} />
            {lang === 'id' ? 'EN' : 'ID'}
          </button>

          <button onClick={toggleDark}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </header>

        {/* Mobile sub-nav strip (only when active group has multiple sub-pages) */}
        {showSubNav && (
          <div className="lg:hidden bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-2.5 flex gap-2 overflow-x-auto scrollbar-hide">
            {activeGroup.sub.map(({ path, labelId, labelEn }) => {
              const active = location.pathname === path;
              return (
                <Link key={path} to={path}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors
                    ${active
                      ? 'bg-green-500 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}>
                  {lang === 'id' ? labelId : labelEn}
                </Link>
              );
            })}
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 pb-24 lg:p-6 lg:pb-6 bg-gray-50 dark:bg-gray-900">
          {children}
        </main>
      </div>

      {/* ── Mobile bottom navigation bar ────────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex items-stretch safe-area-bottom">
        {TAB_GROUPS.map((group) => {
          const active = isGroupActive(group);
          const label = lang === 'id' ? group.labelId : group.labelEn;

          if (group.id === 'profil') {
            return (
              <Link key={group.id} to={group.root}
                className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors select-none
                  ${active ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                <div className={`w-10 h-7 flex items-center justify-center rounded-xl
                  ${active ? 'bg-green-50 dark:bg-green-900/30' : ''}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold
                    ${active
                      ? 'bg-green-500 text-white ring-2 ring-green-200 dark:ring-green-800'
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-300'
                    }`}>
                    {(user?.email?.[0] ?? '?').toUpperCase()}
                  </div>
                </div>
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          }

          const Icon = group.icon;
          return (
            <Link key={group.id} to={group.root}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors select-none
                ${active ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
              <div className={`w-10 h-7 flex items-center justify-center rounded-xl transition-all
                ${active ? 'bg-green-50 dark:bg-green-900/30' : ''}`}>
                <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              </div>
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

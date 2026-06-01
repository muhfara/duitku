import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard, ArrowLeftRight, PieChart,
  ScanLine, Wallet, PiggyBank, Menu, X, ChevronRight, Settings,
  CreditCard, Moon, Sun, Languages,
} from 'lucide-react';
import logoFull from '../assets/logo-full.svg';

export default function Layout({ children }) {
  const { user, darkMode, toggleDark, toggleLang, lang, t } = useApp();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { path: '/',             label: t('dashboard'),     icon: LayoutDashboard },
    { path: '/transactions', label: t('transactions'),  icon: ArrowLeftRight },
    { path: '/wallets',      label: t('wallets'),       icon: Wallet },
    { path: '/savings',      label: t('savings'),       icon: PiggyBank },
    { path: '/debts',        label: t('debts'),         icon: CreditCard },
    { path: '/budget',       label: t('budget'),        icon: PieChart },
    { path: '/reports',      label: t('reports'),       icon: PieChart },
    { path: '/scan',         label: t('scan'),          icon: ScanLine },
  ];

  const currentLabel = [
    ...navItems,
    { path: '/profile', label: t('profile') },
  ].find(n => n.path === location.pathname)?.label ?? 'DuitKu';

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-30
        flex flex-col transition-transform duration-300
        lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <img src={logoFull} alt="DuitKu" className="h-9 dark:brightness-90" />
          <button className="lg:hidden p-1" onClick={() => setSidebarOpen(false)}>
            <X size={18} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ path, label, icon: Icon }) => {
            const active = location.pathname === path;
            return (
              <Link key={path} to={path} onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${active
                    ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}>
                <Icon size={18} />
                {label}
                {active && <ChevronRight size={14} className="ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="px-4 py-4 border-t border-gray-100 dark:border-gray-700">
          <Link to="/profile" onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 w-full rounded-xl p-2 transition-colors mb-2
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

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-3 lg:px-6">
          <button className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
          <h1 className="text-base font-semibold text-gray-800 dark:text-gray-100 lg:text-lg flex-1">{currentLabel}</h1>

          {/* Language toggle */}
          <button onClick={toggleLang}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <Languages size={14} />
            {lang === 'id' ? 'EN' : 'ID'}
          </button>

          {/* Dark mode toggle */}
          <button onClick={toggleDark}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-gray-50 dark:bg-gray-900">
          {children}
        </main>
      </div>
    </div>
  );
}

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Wallet, PiggyBank, ArrowRight, Clock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useApp } from '../context/AppContext';
import { useQuery, fetchTransactions, fetchCategories, fetchDebts, fetchBudgets, fetchWallets, fetchSavings } from '../lib/useData';
import { formatRupiah, formatDate } from '../data/dummyData';

const CURRENT_PERIOD = new Date().toISOString().slice(0, 7);

function StatCard({ label, value, sub, icon: Icon, color, bg }) {
  return (
    <div className={`${bg} rounded-2xl p-4 flex items-start gap-3`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} flex-shrink-0`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
        <p className="text-lg font-bold text-gray-800 dark:text-gray-100 truncate">{value}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500">{sub}</p>}
      </div>
    </div>
  );
}

function formatYAxis(val) {
  if (val >= 1000000) return `${(val / 1000000).toFixed(0)}jt`;
  if (val >= 1000) return `${(val / 1000).toFixed(0)}rb`;
  return val;
}

function buildMonthlyTrend(transactions) {
  const map = {};
  transactions.forEach(t => {
    const month = t.trx_date.slice(0, 7);
    if (!map[month]) map[month] = { income: 0, expense: 0 };
    if (t.type === 'income') map[month].income += Number(t.amount);
    else map[month].expense += Number(t.amount);
  });
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, v]) => ({
      month: new Date(month + '-01').toLocaleDateString('id-ID', { month: 'short' }),
      ...v,
    }));
}

export default function Dashboard() {
  const { user, t } = useApp();
  const { data: transactions = [], loading: tLoading } = useQuery(fetchTransactions, [user?.id]);
  const { data: categories = [] } = useQuery(fetchCategories, [user?.id]);
  const { data: debts = [] } = useQuery(fetchDebts, [user?.id]);
  const { data: budgets = [] } = useQuery(fetchBudgets, [user?.id]);
  const { data: wallets = [] } = useQuery(fetchWallets, [user?.id]);
  const { data: savings = [] } = useQuery(fetchSavings, [user?.id]);

  const thisMonth = useMemo(() => {
    const filtered = transactions.filter(t => t.trx_date.startsWith(CURRENT_PERIOD));
    const income = filtered.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const expense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    return { income, expense };
  }, [transactions]);

  const totalBalance = useMemo(() =>
    wallets.reduce((s, w) => s + Number(w.balance), 0), [wallets]);

  const totalSavings = useMemo(() =>
    savings.filter(s => s.status !== 'cancelled').reduce((s, sv) => s + Number(sv.current_amount), 0),
    [savings]);

  const totalDebt = useMemo(() =>
    debts.filter(d => d.type === 'debt' && d.status !== 'paid').reduce((s, d) => s + Number(d.remaining), 0),
    [debts]);
  const totalReceivable = useMemo(() =>
    debts.filter(d => d.type === 'receivable' && d.status !== 'paid').reduce((s, d) => s + Number(d.remaining), 0),
    [debts]);

  const monthlyTrend = useMemo(() => buildMonthlyTrend(transactions), [transactions]);
  const recentTrx = transactions.slice(0, 5);
  const upcomingDebts = debts.filter(d => d.status !== 'paid').slice(0, 3);

  const budgetAlerts = useMemo(() => {
    return budgets
      .filter(b => b.period === CURRENT_PERIOD)
      .map(b => {
        const cat = categories.find(c => c.id === b.category_id);
        const spent = transactions
          .filter(t => t.category_id === b.category_id && t.type === 'expense' && t.trx_date.startsWith(b.period))
          .reduce((s, t) => s + Number(t.amount), 0);
        const pct = (spent / Number(b.limit_amount)) * 100;
        return { ...b, cat, spent, pct };
      })
      .filter(b => b.pct >= 70)
      .sort((a, b) => b.pct - a.pct);
  }, [budgets, transactions, categories]);

  if (tLoading) return <Spinner />;

  const cardBase = 'rounded-2xl p-4 flex items-start gap-3';

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label={t('totalBalance')} value={formatRupiah(totalBalance)} sub={`${wallets.length} ${t('wallets').toLowerCase()}`} icon={Wallet} color="bg-green-500" bg="bg-green-50 dark:bg-green-900/20" />
        <StatCard label={t('totalSavings')} value={formatRupiah(totalSavings)} sub="dana terkumpul" icon={PiggyBank} color="bg-blue-500" bg="bg-blue-50 dark:bg-blue-900/20" />
        <StatCard label={t('monthlyIncome')} value={formatRupiah(thisMonth.income)} sub={CURRENT_PERIOD} icon={TrendingUp} color="bg-cyan-500" bg="bg-cyan-50 dark:bg-cyan-900/20" />
        <StatCard label={t('monthlyExpense')} value={formatRupiah(thisMonth.expense)} sub={CURRENT_PERIOD} icon={TrendingDown} color="bg-red-500" bg="bg-red-50 dark:bg-red-900/20" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm mb-4">{t('financialTrend')}</h3>
          {monthlyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="income" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <Tooltip formatter={v => formatRupiah(v)} contentStyle={{ background: 'var(--tooltip-bg, #fff)', border: '1px solid #e5e7eb', borderRadius: 8 }} />
                <Area type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2} fill="url(#income)" name={t('income')} />
                <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} fill="url(#expense)" name={t('expense')} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">{t('noTrx')}</p>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{t('budgetStatus')}</h3>
              <Link to="/budget" className="text-xs text-green-600 hover:underline flex items-center gap-0.5">{t('viewAll')} <ArrowRight size={12} /></Link>
            </div>
            {budgetAlerts.length === 0
              ? <p className="text-xs text-gray-400">{t('budgetSafe')}</p>
              : (
                <div className="space-y-2.5">
                  {budgetAlerts.map(b => (
                    <div key={b.id}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-600 dark:text-gray-300">{b.cat?.icon} {b.cat?.name}</span>
                        <span className={b.pct >= 100 ? 'text-red-500 font-medium' : 'text-orange-500 font-medium'}>{Math.round(b.pct)}%</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${b.pct >= 100 ? 'bg-red-500' : 'bg-orange-400'}`} style={{ width: `${Math.min(100, b.pct)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{t('debtReceivable')}</h3>
              <Link to="/debts" className="text-xs text-green-600 hover:underline flex items-center gap-0.5">{t('viewAll')} <ArrowRight size={12} /></Link>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-2.5">
                <p className="text-xs text-gray-400">{t('totalDebt')}</p>
                <p className="text-sm font-bold text-red-500">{formatRupiah(totalDebt)}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-2.5">
                <p className="text-xs text-gray-400">{t('totalReceivable')}</p>
                <p className="text-sm font-bold text-green-600">{formatRupiah(totalReceivable)}</p>
              </div>
            </div>
            {upcomingDebts.length === 0
              ? <p className="text-xs text-gray-400">{t('noDebt')}</p>
              : (
                <div className="space-y-2">
                  {upcomingDebts.map(d => (
                    <div key={d.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-200">{d.counterparty}</p>
                        {d.category && <p className="text-xs text-gray-400">{d.category}</p>}
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock size={10} />{d.due_date ? formatDate(d.due_date) : '—'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-semibold ${d.type === 'debt' ? 'text-red-500' : 'text-green-600'}`}>{formatRupiah(Number(d.remaining))}</p>
                        <p className="text-xs text-gray-400">{d.type === 'debt' ? t('debt') : t('receivable')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>
        </div>
      </div>

      {wallets.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{t('wallets')}</h3>
            <Link to="/wallets" className="text-xs text-green-600 hover:underline flex items-center gap-0.5">{t('manage')} <ArrowRight size={12} /></Link>
          </div>
          <div className="flex gap-3 p-4 overflow-x-auto scrollbar-hide">
            {wallets.map(w => (
              <div key={w.id} className="flex-shrink-0 rounded-xl p-3 min-w-[130px]"
                style={{ backgroundColor: w.color + '15', border: `1px solid ${w.color}30` }}>
                <div className="text-xl mb-1">{w.icon}</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{w.name}</p>
                <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{formatRupiah(Number(w.balance))}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{t('recentTrx')}</h3>
          <Link to="/transactions" className="text-xs text-green-600 hover:underline flex items-center gap-0.5">{t('viewAll')} <ArrowRight size={12} /></Link>
        </div>
        {recentTrx.length === 0
          ? <p className="text-sm text-gray-400 text-center py-8">{t('noTrx')}</p>
          : (
            <div className="divide-y divide-gray-50 dark:divide-gray-700">
              {recentTrx.map(tx => <TrxRow key={tx.id} trx={tx} categories={categories} wallets={wallets} />)}
            </div>
          )}
      </div>
    </div>
  );
}

function TrxRow({ trx, categories, wallets }) {
  const cat = categories.find(c => c.id === trx.category_id);
  const wallet = wallets.find(w => w.id === trx.wallet_id);
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
        style={{ backgroundColor: (cat?.color ?? '#64748b') + '20' }}>
        {cat?.icon ?? '📦'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{trx.note || cat?.name}</p>
        <p className="text-xs text-gray-400">
          {formatDate(trx.trx_date)}{wallet ? ` · ${wallet.icon} ${wallet.name}` : ''}
        </p>
      </div>
      <p className={`text-sm font-semibold flex-shrink-0 ${trx.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
        {trx.type === 'income' ? '+' : '-'}{formatRupiah(Number(trx.amount))}
      </p>
    </div>
  );
}

function Spinner() {
  return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" /></div>;
}

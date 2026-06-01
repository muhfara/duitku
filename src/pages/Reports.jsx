import { useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { useQuery, fetchTransactions, fetchCategories, fetchBudgets } from '../lib/useData';
import { formatRupiah } from '../data/dummyData';

const CURRENT_PERIOD = new Date().toISOString().slice(0, 7);

function formatYAxis(val) {
  if (val >= 1000000) return `${(val / 1000000).toFixed(0)}jt`;
  if (val >= 1000) return `${(val / 1000).toFixed(0)}rb`;
  return val;
}

const RADIAN = Math.PI / 180;
function CustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.05) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="600">{`${(percent * 100).toFixed(0)}%`}</text>;
}

function buildTrend(transactions) {
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

export default function Reports() {
  const { user } = useApp();
  const { data: transactions = [], loading } = useQuery(fetchTransactions, [user?.id]);
  const { data: categories = [] } = useQuery(fetchCategories, [user?.id]);
  const { data: budgets = [] } = useQuery(fetchBudgets, [user?.id]);

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

  const expenseByCategory = useMemo(() => {
    const current = transactions.filter(t => t.type === 'expense' && t.trx_date.startsWith(CURRENT_PERIOD));
    const map = {};
    current.forEach(t => { map[t.category_id] = (map[t.category_id] ?? 0) + Number(t.amount); });
    return Object.entries(map).map(([catId, amount]) => {
      const cat = categories.find(c => c.id === catId);
      return { name: cat?.name ?? 'Lain', amount, color: cat?.color ?? '#64748b', icon: cat?.icon };
    }).sort((a, b) => b.amount - a.amount);
  }, [transactions, categories]);

  const budgetVsActual = useMemo(() => {
    return budgets.filter(b => b.period === CURRENT_PERIOD).map(b => {
      const cat = categories.find(c => c.id === b.category_id);
      const actual = transactions
        .filter(t => t.category_id === b.category_id && t.type === 'expense' && t.trx_date.startsWith(CURRENT_PERIOD))
        .reduce((s, t) => s + Number(t.amount), 0);
      return { name: cat?.name ?? '-', anggaran: Number(b.limit_amount), aktual: actual };
    });
  }, [budgets, categories, transactions]);

  const monthlyTrend = useMemo(() => buildTrend(transactions), [transactions]);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Pemasukan', value: totalIncome, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Total Pengeluaran', value: totalExpense, color: 'text-red-500', bg: 'bg-red-50' },
          { label: 'Saldo Bersih', value: totalIncome - totalExpense, color: 'text-blue-600', bg: 'bg-blue-50' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl p-3`}>
            <p className="text-xs text-gray-500">{label}</p>
            <p className={`text-sm font-bold ${color} mt-0.5`}>{formatRupiah(value)}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-4 border border-gray-100">
        <h3 className="font-semibold text-gray-800 text-sm mb-4">Tren Pemasukan vs Pengeluaran</h3>
        {monthlyTrend.length === 0
          ? <p className="text-sm text-gray-400 text-center py-8">Belum ada data</p>
          : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="gin" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gex" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 10 }} />
                <Tooltip formatter={v => formatRupiah(v)} />
                <Legend />
                <Area type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2} fill="url(#gin)" name="Pemasukan" />
                <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} fill="url(#gex)" name="Pengeluaran" />
              </AreaChart>
            </ResponsiveContainer>
          )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <h3 className="font-semibold text-gray-800 text-sm mb-4">Komposisi Pengeluaran (Bulan Ini)</h3>
          {expenseByCategory.length === 0
            ? <p className="text-sm text-gray-400 text-center py-8">Belum ada pengeluaran bulan ini</p>
            : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={expenseByCategory} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={90} labelLine={false} label={CustomLabel}>
                      {expenseByCategory.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={v => formatRupiah(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-3">
                  {expenseByCategory.map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                        <span className="text-gray-600">{c.icon} {c.name}</span>
                      </div>
                      <span className="font-medium text-gray-700">{formatRupiah(c.amount)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <h3 className="font-semibold text-gray-800 text-sm mb-4">Anggaran vs Realisasi (Bulan Ini)</h3>
          {budgetVsActual.length === 0
            ? <p className="text-sm text-gray-400 text-center py-8">Belum ada anggaran</p>
            : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={budgetVsActual} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tickFormatter={formatYAxis} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={72} />
                  <Tooltip formatter={v => formatRupiah(v)} />
                  <Legend />
                  <Bar dataKey="anggaran" fill="#e2e8f0" name="Anggaran" radius={[0, 3, 3, 0]} />
                  <Bar dataKey="aktual" fill="#22c55e" name="Aktual" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
        </div>
      </div>
    </div>
  );
}

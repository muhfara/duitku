import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { useQuery, fetchTransactions, fetchCategories, fetchBudgets } from '../lib/useData';
import { formatRupiah } from '../data/dummyData';
import { Spinner } from '../components/shared';

function fmtY(v) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}jt`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}rb`;
  return v;
}

const RADIAN = Math.PI / 180;
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.05) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  return (
    <text x={cx + r * Math.cos(-midAngle * RADIAN)} y={cy + r * Math.sin(-midAngle * RADIAN)}
      fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="600">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

// ─── Period helpers ──────────────────────────────────────────────────────────

const PERIODS = [
  { value: 'day',   label: 'Harian' },
  { value: 'week',  label: 'Mingguan' },
  { value: 'month', label: 'Bulanan' },
  { value: 'year',  label: 'Tahunan' },
];

function getPeriodBounds(period, offset) {
  const now = new Date();
  let start, end, label;

  if (period === 'year') {
    const y = now.getFullYear() + offset;
    start = new Date(y, 0, 1);
    end   = new Date(y, 11, 31);
    label = `${y}`;
  } else if (period === 'month') {
    const base = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    start = base;
    end   = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    label = base.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  } else if (period === 'week') {
    const base = new Date(now);
    base.setDate(base.getDate() + offset * 7);
    const dow = base.getDay();
    start = new Date(base);
    start.setDate(base.getDate() - (dow === 0 ? 6 : dow - 1));
    end = new Date(start);
    end.setDate(start.getDate() + 6);
    label = `${start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  } else {
    const base = new Date(now);
    base.setDate(base.getDate() + offset);
    start = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    end   = new Date(start);
    label = base.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  return {
    startStr: start.toISOString().slice(0, 10),
    endStr:   end.toISOString().slice(0, 10),
    label,
  };
}

function inPeriod(trxDate, bounds) {
  const d = trxDate.slice(0, 10);
  return d >= bounds.startStr && d <= bounds.endStr;
}

function buildChartData(transactions, period, bounds) {
  const filtered = transactions.filter(t => inPeriod(t.trx_date, bounds));

  const add = (map, key, t) => {
    if (!map[key]) return;
    map[key][t.type === 'income' ? 'income' : 'expense'] += Number(t.amount);
  };

  if (period === 'year') {
    const y = parseInt(bounds.startStr);
    const map = {};
    for (let m = 0; m < 12; m++)
      map[`${y}-${String(m + 1).padStart(2, '0')}`] = { income: 0, expense: 0 };
    filtered.forEach(t => add(map, t.trx_date.slice(0, 7), t));
    return Object.entries(map).map(([k, v]) => ({
      label: new Date(k + '-01T12:00:00').toLocaleDateString('id-ID', { month: 'short' }),
      ...v,
    }));
  }

  if (period === 'month' || period === 'week') {
    const map = {};
    const cur = new Date(bounds.startStr + 'T12:00:00');
    const endD = new Date(bounds.endStr + 'T12:00:00');
    while (cur <= endD) {
      map[cur.toISOString().slice(0, 10)] = { income: 0, expense: 0 };
      cur.setDate(cur.getDate() + 1);
    }
    filtered.forEach(t => add(map, t.trx_date.slice(0, 10), t));
    return Object.entries(map).map(([k, v]) => ({
      label: period === 'week'
        ? new Date(k + 'T12:00:00').toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' })
        : String(new Date(k + 'T12:00:00').getDate()),
      ...v,
    }));
  }

  // day — single summary point
  const income  = filtered.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const expense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  return income + expense > 0 ? [{ label: 'Hari ini', income, expense }] : [];
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function Reports() {
  const { user } = useApp();
  const { data: transactions = [], loading } = useQuery(fetchTransactions, [user?.id]);
  const { data: categories = [] }            = useQuery(fetchCategories,   [user?.id]);
  const { data: budgets = [] }               = useQuery(fetchBudgets,      [user?.id]);

  const [period, setPeriod] = useState('month');
  const [offset, setOffset] = useState(0);

  const bounds = useMemo(() => getPeriodBounds(period, offset), [period, offset]);

  const periodTrx = useMemo(
    () => transactions.filter(t => inPeriod(t.trx_date, bounds)),
    [transactions, bounds],
  );

  const totalIncome  = useMemo(() => periodTrx.filter(t => t.type === 'income').reduce((s, t)  => s + Number(t.amount), 0), [periodTrx]);
  const totalExpense = useMemo(() => periodTrx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0), [periodTrx]);

  const chartData = useMemo(() => buildChartData(transactions, period, bounds), [transactions, period, bounds]);
  const hasChartData = chartData.some(d => d.income > 0 || d.expense > 0);

  const expenseByCategory = useMemo(() => {
    const map = {};
    periodTrx.filter(t => t.type === 'expense').forEach(t => {
      map[t.category_id] = (map[t.category_id] ?? 0) + Number(t.amount);
    });
    return Object.entries(map).map(([catId, amount]) => {
      const cat = categories.find(c => c.id === catId);
      return { name: cat?.name ?? 'Lain', amount, color: cat?.color ?? '#64748b', icon: cat?.icon };
    }).sort((a, b) => b.amount - a.amount);
  }, [periodTrx, categories]);

  const budgetVsActual = useMemo(() => {
    if (period !== 'month') return [];
    const mon = bounds.startStr.slice(0, 7);
    return budgets.filter(b => b.period === mon).map(b => {
      const cat = categories.find(c => c.id === b.category_id);
      const actual = periodTrx
        .filter(t => t.category_id === b.category_id && t.type === 'expense')
        .reduce((s, t) => s + Number(t.amount), 0);
      return { name: cat?.name ?? '-', anggaran: Number(b.limit_amount), aktual: actual };
    });
  }, [budgets, categories, periodTrx, period, bounds]);

  const feeRecap = useMemo(() => ({
    adminFee: periodTrx
      .filter(t => t.type === 'expense' && t.note?.toLowerCase().startsWith('admin transfer'))
      .reduce((s, t) => s + Number(t.amount), 0),
    bungaHutang: periodTrx
      .filter(t => t.type === 'expense' && t.note?.toLowerCase().startsWith('bunga hutang'))
      .reduce((s, t) => s + Number(t.amount), 0),
    bungaPinjaman: periodTrx
      .filter(t => t.type === 'income' && t.note?.toLowerCase().startsWith('bunga pinjaman'))
      .reduce((s, t) => s + Number(t.amount), 0),
  }), [periodTrx]);

  const hasFees = feeRecap.adminFee > 0 || feeRecap.bungaHutang > 0 || feeRecap.bungaPinjaman > 0;

  if (loading) return <Spinner />;

  return (
    <div className="space-y-5">

      {/* ── Period selector ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl mb-3">
          {PERIODS.map(p => (
            <button key={p.value} onClick={() => { setPeriod(p.value); setOffset(0); }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors
                ${period === p.value
                  ? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2">
          <button onClick={() => setOffset(o => o - 1)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">
            <ChevronLeft size={18} />
          </button>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 text-center flex-1 truncate">{bounds.label}</p>
          <button onClick={() => setOffset(o => o + 1)} disabled={offset >= 0}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 disabled:opacity-30">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pemasukan',  value: totalIncome,               color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
          { label: 'Pengeluaran',value: totalExpense,               color: 'text-red-500',   bg: 'bg-red-50 dark:bg-red-900/20' },
          { label: 'Selisih',    value: totalIncome - totalExpense, color: totalIncome - totalExpense >= 0 ? 'text-blue-600' : 'text-red-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl p-3`}>
            <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
            <p className={`text-sm font-bold ${color} mt-0.5`}>{formatRupiah(value)}</p>
          </div>
        ))}
      </div>

      {/* ── Trend chart ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm mb-4">
          {period === 'year' ? 'Tren Per Bulan' : period === 'month' ? 'Tren Per Hari' : period === 'week' ? 'Tren Per Hari (Minggu Ini)' : 'Ringkasan Hari Ini'}
        </h3>

        {period === 'day' ? (
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="text-center bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pemasukan</p>
              <p className="text-lg font-bold text-green-600">{formatRupiah(totalIncome)}</p>
            </div>
            <div className="text-center bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pengeluaran</p>
              <p className="text-lg font-bold text-red-500">{formatRupiah(totalExpense)}</p>
            </div>
          </div>
        ) : !hasChartData ? (
          <p className="text-sm text-gray-400 text-center py-8">Belum ada transaksi di periode ini</p>
        ) : period === 'year' ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gin" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gex" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={fmtY} tick={{ fontSize: 10 }} width={40} />
              <Tooltip formatter={v => formatRupiah(v)} />
              <Legend />
              <Area type="monotone" dataKey="income"  stroke="#22c55e" strokeWidth={2} fill="url(#gin)" name="Pemasukan" />
              <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} fill="url(#gex)" name="Pengeluaran" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: period === 'month' ? 9 : 11 }} interval={period === 'month' ? 4 : 0} />
              <YAxis tickFormatter={fmtY} tick={{ fontSize: 10 }} width={40} />
              <Tooltip formatter={v => formatRupiah(v)} />
              <Legend />
              <Line type="monotone" dataKey="income"  stroke="#22c55e" strokeWidth={2} dot={period === 'week'} activeDot={{ r: 4 }} name="Pemasukan" />
              <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} dot={period === 'week'} activeDot={{ r: 4 }} name="Pengeluaran" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Rekap biaya admin & bunga ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm mb-3">Rekap Admin Transfer &amp; Bunga</h3>
        {!hasFees ? (
          <p className="text-sm text-gray-400 text-center py-4">Tidak ada biaya admin atau bunga di periode ini</p>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-700">
            {feeRecap.adminFee > 0 && (
              <div className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-200 font-medium">Admin Transfer</p>
                  <p className="text-xs text-gray-400">Biaya transfer bank / e-wallet</p>
                </div>
                <p className="text-sm font-semibold text-red-500">-{formatRupiah(feeRecap.adminFee)}</p>
              </div>
            )}
            {feeRecap.bungaHutang > 0 && (
              <div className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-200 font-medium">Bunga Hutang</p>
                  <p className="text-xs text-gray-400">Bunga yang kamu bayarkan</p>
                </div>
                <p className="text-sm font-semibold text-red-500">-{formatRupiah(feeRecap.bungaHutang)}</p>
              </div>
            )}
            {feeRecap.bungaPinjaman > 0 && (
              <div className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-200 font-medium">Bunga Pinjaman</p>
                  <p className="text-xs text-gray-400">Bunga yang kamu terima (pendapatan)</p>
                </div>
                <p className="text-sm font-semibold text-green-600">+{formatRupiah(feeRecap.bungaPinjaman)}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── Expense by category ── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm mb-4">Komposisi Pengeluaran</h3>
          {expenseByCategory.length === 0
            ? <p className="text-sm text-gray-400 text-center py-8">Belum ada pengeluaran</p>
            : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={expenseByCategory} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={90} labelLine={false} label={PieLabel}>
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
                        <span className="text-gray-600 dark:text-gray-300">{c.icon} {c.name}</span>
                      </div>
                      <span className="font-medium text-gray-700 dark:text-gray-200">{formatRupiah(c.amount)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
        </div>

        {/* ── Budget vs actual (month only) ── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm mb-4">Anggaran vs Realisasi</h3>
          {period !== 'month' ? (
            <p className="text-sm text-gray-400 text-center py-8">Hanya tersedia di filter Bulanan</p>
          ) : budgetVsActual.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Belum ada anggaran bulan ini</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={budgetVsActual} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tickFormatter={fmtY} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={72} />
                <Tooltip formatter={v => formatRupiah(v)} />
                <Legend />
                <Bar dataKey="anggaran" fill="#e2e8f0" name="Anggaran" radius={[0, 3, 3, 0]} />
                <Bar dataKey="aktual"   fill="#22c55e" name="Aktual"   radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

      </div>
    </div>
  );
}

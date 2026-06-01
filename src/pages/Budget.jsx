import { useState, useMemo } from 'react';
import { Plus, X, AlertTriangle, CheckCircle, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useQuery, fetchBudgets, fetchCategories, fetchTransactions, upsertBudget, deleteBudget } from '../lib/useData';
import { formatRupiah } from '../data/dummyData';
import { Modal, RupiahInput, Spinner, selectCls } from '../components/shared';

const CURRENT_PERIOD = new Date().toISOString().slice(0, 7);
const PERIOD_LABEL = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

function BudgetForm({ existing, userId, categories, onSave, onClose, t }) {
  const expCats = categories.filter(c => c.type === 'expense');
  const [form, setForm] = useState({
    category_id: existing?.category_id ?? '',
    limit_amount: existing?.limit_amount ? String(Math.round(Number(existing.limit_amount))) : '',
    period: CURRENT_PERIOD,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await upsertBudget({ ...form, limit_amount: parseFloat(form.limit_amount), user_id: userId });
      onSave(); onClose();
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  return (
    <>
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">{existing ? t('editBudget') : t('setBudget')}</h2>
        <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
      </div>
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {error && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/30 px-3 py-2 rounded-lg">{error}</p>}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('category')}</label>
          <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
            className={selectCls()} required disabled={!!existing}>
            <option value="">Pilih kategori</option>
            {expCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('budgetLimit')} — {PERIOD_LABEL}</label>
          <RupiahInput rawValue={form.limit_amount} onRawChange={v => setForm(f => ({ ...f, limit_amount: v }))}
            className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            required />
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 py-2.5 rounded-lg text-sm font-medium">{t('cancel')}</button>
          <button type="submit" disabled={loading} className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-medium">
            {loading ? t('saving') : t('save')}
          </button>
        </div>
      </form>
    </>
  );
}

export default function Budget() {
  const { user, t } = useApp();
  const { data: budgets = [], loading, refetch } = useQuery(fetchBudgets, [user?.id]);
  const { data: categories = [] } = useQuery(fetchCategories, [user?.id]);
  const { data: transactions = [] } = useQuery(fetchTransactions, [user?.id]);
  const [showModal, setShowModal] = useState(false);
  const [editBudget, setEditBudget] = useState(null);

  const budgetStats = useMemo(() => {
    return budgets
      .filter(b => b.period === CURRENT_PERIOD)
      .map(b => {
        const cat = categories.find(c => c.id === b.category_id);
        const spent = transactions
          .filter(tx => tx.category_id === b.category_id && tx.type === 'expense' && tx.trx_date.startsWith(b.period))
          .reduce((s, tx) => s + Number(tx.amount), 0);
        const pct = (spent / Number(b.limit_amount)) * 100;
        return { ...b, cat, spent, pct, remaining: Number(b.limit_amount) - spent };
      })
      .sort((a, b) => b.pct - a.pct);
  }, [budgets, categories, transactions]);

  const totalBudget = budgetStats.reduce((s, b) => s + Number(b.limit_amount), 0);
  const totalSpent = budgetStats.reduce((s, b) => s + b.spent, 0);
  const overBudget = budgetStats.filter(b => b.pct >= 100).length;

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm(t('deleteBudget'))) return;
    try { await deleteBudget(id); refetch(); } catch (err) { alert(err.message); }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      {totalBudget > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{t('budgetPeriod')} {PERIOD_LABEL}</p>
              <p className="text-xs text-gray-400">Total anggaran yang ditetapkan</p>
            </div>
            {overBudget > 0 && (
              <div className="flex items-center gap-1 text-xs text-red-500 bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded-lg">
                <AlertTriangle size={12} />{overBudget} {t('overBudget')}
              </div>
            )}
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-2xl font-bold text-gray-800 dark:text-gray-100">{formatRupiah(totalSpent)}</span>
            <span className="text-sm text-gray-400 pb-1">{t('from')} {formatRupiah(totalBudget)}</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
            <div className={`h-2 rounded-full ${(totalSpent / totalBudget) >= 1 ? 'bg-red-500' : (totalSpent / totalBudget) >= 0.8 ? 'bg-orange-400' : 'bg-green-500'}`}
              style={{ width: `${Math.min(100, (totalSpent / totalBudget) * 100)}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1.5">Sisa: {formatRupiah(Math.max(0, totalBudget - totalSpent))}</p>
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={() => { setEditBudget(null); setShowModal(true); }}
          className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium">
          <Plus size={16} />{t('setBudget')}
        </button>
      </div>

      <div className="space-y-3">
        {budgetStats.length === 0
          ? <div className="bg-white dark:bg-gray-800 rounded-2xl py-12 text-center text-gray-400 text-sm border border-gray-100 dark:border-gray-700">{t('noBudget')}</div>
          : budgetStats.map(b => (
            <div key={b.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 hover:border-green-200 dark:hover:border-green-700 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <button className="flex items-center gap-2 flex-1" onClick={() => { setEditBudget(b); setShowModal(true); }}>
                  <span className="text-xl">{b.cat?.icon}</span>
                  <span className="font-medium text-gray-800 dark:text-gray-100 text-sm">{b.cat?.name}</span>
                </button>
                <div className="flex items-center gap-2">
                  {b.pct >= 100 ? <AlertTriangle size={14} className="text-red-500" /> : b.pct >= 80 ? <AlertTriangle size={14} className="text-orange-400" /> : <CheckCircle size={14} className="text-green-500" />}
                  <span className={`text-sm font-bold ${b.pct >= 100 ? 'text-red-500' : b.pct >= 80 ? 'text-orange-500' : 'text-green-600'}`}>{Math.round(b.pct)}%</span>
                  <button onClick={(e) => handleDelete(b.id, e)} className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 mb-2">
                <div className={`h-2 rounded-full ${b.pct >= 100 ? 'bg-red-500' : b.pct >= 80 ? 'bg-orange-400' : 'bg-green-500'}`} style={{ width: `${Math.min(100, b.pct)}%` }} />
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>{t('used')}: <span className="font-medium text-gray-700 dark:text-gray-200">{formatRupiah(b.spent)}</span></span>
                <span>{t('limit')}: <span className="font-medium text-gray-700 dark:text-gray-200">{formatRupiah(Number(b.limit_amount))}</span></span>
              </div>
              {b.remaining < 0 && <p className="text-xs text-red-500 mt-1.5 font-medium">{t('overBy')} {formatRupiah(Math.abs(b.remaining))}</p>}
            </div>
          ))
        }
      </div>

      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <BudgetForm existing={editBudget} userId={user?.id} categories={categories} onSave={refetch} onClose={() => { setShowModal(false); setEditBudget(null); }} t={t} />
        </Modal>
      )}
    </div>
  );
}

import { useState, useMemo } from 'react';
import { Plus, Search, Trash2, X, Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useQuery, fetchTransactions, fetchCategories, fetchWallets, createTransaction, updateTransaction, deleteTransaction } from '../lib/useData';
import { formatRupiah, formatDate } from '../data/dummyData';
import { Modal, RupiahInput, Spinner, inputCls, selectCls } from '../components/shared';

const PAYMENT_METHODS = ['cash', 'transfer', 'ewallet'];

const WALLET_TYPE_TO_PAYMENT = { cash: 'cash', bank: 'transfer', ewallet: 'ewallet', other: 'cash' };

function getPaymentMethodFromWallet(walletId, wallets) {
  const wallet = wallets.find(w => w.id === walletId);
  return WALLET_TYPE_TO_PAYMENT[wallet?.type] ?? 'cash';
}

function TransactionForm({ categories, wallets, userId, onSave, onClose, initial, t }) {
  const defaultWallet = wallets.find(w => w.is_default)?.id ?? wallets[0]?.id ?? '';
  const isEdit = !!initial;
  const initialWalletId = initial?.wallet_id ?? defaultWallet;
  const [form, setForm] = useState({
    type: initial?.type ?? 'expense',
    category_id: initial?.category_id ?? '',
    amount: initial?.amount ? String(Math.round(Number(initial.amount))) : '',
    trx_date: initial?.trx_date ?? new Date().toISOString().split('T')[0],
    wallet_id: initialWalletId,
    payment_method: initial?.payment_method ?? getPaymentMethodFromWallet(initialWalletId, wallets),
    note: initial?.note ?? '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const filtered = categories.filter(c => c.type === form.type);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category_id || !form.amount) return;
    setLoading(true);
    try {
      const payload = {
        type: form.type, category_id: form.category_id,
        amount: parseFloat(form.amount), trx_date: form.trx_date,
        wallet_id: form.wallet_id || null,
        payment_method: form.payment_method,
        note: form.note, user_id: userId,
      };
      if (isEdit) await updateTransaction(initial.id, payload);
      else await createTransaction(payload);
      onSave(); onClose();
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  const payMethodLabels = { cash: t('cash'), transfer: t('transfer'), ewallet: t('ewallet') };

  return (
    <>
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">{isEdit ? t('editTrx') : t('recordTrx')}</h2>
        <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
      </div>
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {error && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/30 px-3 py-2 rounded-lg">{error}</p>}
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
          {['expense', 'income'].map(tp => (
            <button key={tp} type="button"
              onClick={() => setForm(f => ({ ...f, type: tp, category_id: '' }))}
              className={`flex-1 py-2 text-sm font-medium transition-colors
                ${form.type === tp ? (tp === 'expense' ? 'bg-red-500 text-white' : 'bg-green-500 text-white') : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
              {tp === 'expense' ? t('expense') : t('income')}
            </button>
          ))}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('nominal')}</label>
          <RupiahInput rawValue={form.amount} onRawChange={v => setForm(f => ({ ...f, amount: v }))} className={inputCls()} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('category')}</label>
          <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} className={selectCls()} required>
            <option value="">{t('chooseCategory')}</option>
            {filtered.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('wallet')}</label>
          <select value={form.wallet_id} onChange={e => {
              const wid = e.target.value;
              setForm(f => ({ ...f, wallet_id: wid, payment_method: getPaymentMethodFromWallet(wid, wallets) }));
            }} className={selectCls()}>
            <option value="">{t('noWallet')}</option>
            {wallets.map(w => <option key={w.id} value={w.id}>{w.icon} {w.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('date')}</label>
            <input type="date" value={form.trx_date} onChange={e => setForm(f => ({ ...f, trx_date: e.target.value }))} className={inputCls()} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('paymentMethod')}</label>
            <div className="w-full border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2.5 text-sm flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-300">{payMethodLabels[form.payment_method]}</span>
              <span className="text-xs text-gray-400 italic">{t('autoFilled')}</span>
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('note')}</label>
          <input type="text" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} className={inputCls()} placeholder={t('optional')} />
        </div>
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="flex-1 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 py-2.5 rounded-lg text-sm font-medium">{t('cancel')}</button>
          <button type="submit" disabled={loading} className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-medium">
            {loading ? t('saving') : t('save')}
          </button>
        </div>
      </form>
    </>
  );
}

export default function Transactions() {
  const { user, t, lang } = useApp();
  const { data: transactions = [], loading, refetch } = useQuery(fetchTransactions, [user?.id]);
  const { data: categories = [] } = useQuery(fetchCategories, [user?.id]);
  const { data: wallets = [], loading: wLoading } = useQuery(fetchWallets, [user?.id]);
  const [showModal, setShowModal] = useState(false);
  const [editTrx, setEditTrx] = useState(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const getDateLabel = (dateStr) => {
    if (dateStr === today) return t('today');
    if (dateStr === yesterday) return t('yesterday');
    const d = new Date(dateStr + 'T12:00:00');
    const opts = { weekday: 'long', day: 'numeric', month: 'long' };
    if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
    return d.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', opts);
  };

  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      const cat = categories.find(c => c.id === tx.category_id);
      const matchSearch = !search ||
        (tx.note ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (cat?.name ?? '').toLowerCase().includes(search.toLowerCase());
      const matchType = filterType === 'all' || tx.type === filterType;
      return matchSearch && matchType;
    });
  }, [transactions, categories, search, filterType]);

  const grouped = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => {
      if (a.trx_date !== b.trx_date) return b.trx_date.localeCompare(a.trx_date);
      return new Date(b.created_at) - new Date(a.created_at);
    });
    const map = new Map();
    for (const tx of sorted) {
      if (!map.has(tx.trx_date)) map.set(tx.trx_date, []);
      map.get(tx.trx_date).push(tx);
    }
    return [...map.entries()].map(([date, items]) => ({ date, items }));
  }, [filtered]);

  const totalIncome = filtered.filter(tx => tx.type === 'income').reduce((s, tx) => s + Number(tx.amount), 0);
  const totalExpense = filtered.filter(tx => tx.type === 'expense').reduce((s, tx) => s + Number(tx.amount), 0);

  const closeModal = () => { setShowModal(false); setEditTrx(null); };

  if (loading || wLoading) return <Spinner />;

  const noWallets = wallets.length === 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('income')}</p>
          <p className="text-base font-bold text-green-600">{formatRupiah(totalIncome)}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('expense')}</p>
          <p className="text-base font-bold text-red-500">{formatRupiah(totalExpense)}</p>
        </div>
      </div>

      {noWallets && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            {t('noWalletWarning')}{' '}
            <Link to="/wallets" className="underline font-medium">{t('addWallet')}</Link>
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('searchTrx')}
            className="w-full pl-8 pr-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white" />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none">
          <option value="all">{t('all')}</option>
          <option value="income">{t('income')}</option>
          <option value="expense">{t('expense')}</option>
        </select>
        <button onClick={() => !noWallets && setShowModal(true)} disabled={noWallets}
          className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3 py-2.5 rounded-lg text-sm font-medium flex-shrink-0">
          <Plus size={16} /><span className="hidden sm:inline">{t('recordTrx')}</span>
        </button>
      </div>

      {grouped.length === 0
        ? <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 py-12 text-center text-gray-400 text-sm">{t('noTrxData')}</div>
        : (
          <div className="space-y-3">
            {grouped.map(({ date, items }) => {
              const dayIncome = items.filter(tx => tx.type === 'income').reduce((s, tx) => s + Number(tx.amount), 0);
              const dayExpense = items.filter(tx => tx.type === 'expense').reduce((s, tx) => s + Number(tx.amount), 0);
              return (
                <div key={date} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                  <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 capitalize">{getDateLabel(date)}</span>
                    <span className="text-xs flex items-center gap-2">
                      {dayExpense > 0 && <span className="text-red-400">-{formatRupiah(dayExpense)}</span>}
                      {dayIncome > 0 && <span className="text-green-500">+{formatRupiah(dayIncome)}</span>}
                    </span>
                  </div>
                  <div className="divide-y divide-gray-50 dark:divide-gray-700">
                    {items.map(tx => {
                      const cat = categories.find(c => c.id === tx.category_id);
                      const wallet = wallets.find(w => w.id === tx.wallet_id);
                      const pmLabel = { cash: t('cash'), transfer: t('transfer'), ewallet: t('ewallet') }[tx.payment_method] ?? tx.payment_method;
                      return (
                        <div key={tx.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 group">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                            style={{ backgroundColor: (cat?.color ?? '#64748b') + '20' }}>{cat?.icon ?? '📦'}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{tx.note || cat?.name}</p>
                            <p className="text-xs text-gray-400">
                              {pmLabel}{wallet ? ` · ${wallet.icon} ${wallet.name}` : ''}
                            </p>
                          </div>
                          <p className={`text-sm font-semibold flex-shrink-0 ${tx.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                            {tx.type === 'income' ? '+' : '-'}{formatRupiah(Number(tx.amount))}
                          </p>
                          <div className="ml-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => setEditTrx(tx)} className="p-1.5 rounded-lg text-gray-300 hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => { deleteTransaction(tx.id); refetch(); }} className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )
      }

      {(showModal || editTrx) && (
        <Modal onClose={closeModal}>
          <TransactionForm categories={categories} wallets={wallets} userId={user?.id}
            onSave={() => refetch()} onClose={closeModal} initial={editTrx} t={t} />
        </Modal>
      )}
    </div>
  );
}

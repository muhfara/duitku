import { useState } from 'react';
import { Plus, X, ChevronDown, ChevronUp, PiggyBank, Pencil, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useQuery, fetchSavings, fetchSavingsTransactions, fetchWallets, createSavings, updateSavings, deleteSavings, createSavingsTransaction, adjustWalletBalance, createTransaction } from '../lib/useData';
import { formatRupiah, formatDate } from '../data/dummyData';
import { Modal, RupiahInput, Spinner, inputCls, selectCls } from '../components/shared';

const ICONS = ['🎯','🏖️','🏠','🚗','💍','📱','✈️','🎓','💻','🛒','🏋️','🎮','👶','🏥','💰'];
const COLORS = ['#22c55e','#3b82f6','#f97316','#a855f7','#ef4444','#06b6d4','#ec4899','#84cc16','#1e40af','#f59e0b'];

function SavingsForm({ onSave, onClose, userId, initial, t }) {
  const isEdit = !!initial;
  const [form, setForm] = useState({
    name: initial?.name ?? '', target_amount: initial?.target_amount ? String(Math.round(Number(initial.target_amount))) : '',
    icon: initial?.icon ?? '🎯', color: initial?.color ?? '#22c55e',
    deadline: initial?.deadline ?? '', note: initial?.note ?? '',
    initial_amount: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const payload = { name: form.name, target_amount: parseFloat(form.target_amount), icon: form.icon, color: form.color, deadline: form.deadline || null, note: form.note || null };
      if (isEdit) {
        await updateSavings(initial.id, payload);
      } else {
        const newSavings = await createSavings({ ...payload, user_id: userId });
        if (form.initial_amount && parseFloat(form.initial_amount) > 0) {
          await createSavingsTransaction({
            savings_id: newSavings.id,
            amount: parseFloat(form.initial_amount),
            type: 'deposit',
            note: 'Saldo awal',
            trx_date: new Date().toISOString().split('T')[0],
          });
        }
      }
      onSave(); onClose();
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  return (
    <>
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">{isEdit ? t('editSavings') : t('createSavings')}</h2>
        <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
      </div>
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {error && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/30 px-3 py-2 rounded-lg">{error}</p>}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('savingsName')}</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls()} placeholder="Dana Darurat, DP Rumah, ..." required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('target')}</label>
          <RupiahInput rawValue={form.target_amount} onRawChange={v => setForm(f => ({ ...f, target_amount: v }))} className={inputCls()} required />
        </div>
        {!isEdit && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('initialBalance')} ({t('optional')})</label>
            <RupiahInput rawValue={form.initial_amount} onRawChange={v => setForm(f => ({ ...f, initial_amount: v }))} className={inputCls()} />
            <p className="text-xs text-gray-400 mt-1">💡 Untuk tabungan yang sudah ada sebelum menggunakan DuitKu</p>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('icon')}</label>
          <div className="flex flex-wrap gap-2">
            {ICONS.map(ic => (
              <button key={ic} type="button" onClick={() => setForm(f => ({ ...f, icon: ic }))}
                className={`text-xl w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${form.icon === ic ? 'border-green-500 bg-green-50 dark:bg-green-900/30' : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                {ic}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('color')}</label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map(c => (
              <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c ? 'border-gray-800 dark:border-gray-100 scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('deadline')} ({t('optional')})</label>
          <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} className={inputCls()} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('note')}</label>
          <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} className={inputCls()} placeholder={t('optional')} />
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

function DeleteSavingsModal({ saving, wallets, onSave, onClose, t }) {
  const [walletId, setWalletId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      if (walletId && Number(saving.current_amount) > 0) {
        await adjustWalletBalance(walletId, Number(saving.current_amount));
      }
      await deleteSavings(saving.id);
      onSave(); onClose();
    } catch (e) { alert(e.message); setLoading(false); }
  };

  const hasBalance = Number(saving.current_amount) > 0;

  return (
    <>
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">{t('deleteSavings')}</h2>
        <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
      </div>
      <div className="p-5 space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">{t('deleteSavingsConfirm')} <strong>{saving.name}</strong>?</p>
        {hasBalance && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-3">
            <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
              Saldo tabungan <strong>{formatRupiah(Number(saving.current_amount))}</strong> akan dikembalikan ke:
            </p>
            <select value={walletId} onChange={e => setWalletId(e.target.value)} className={selectCls()}>
              <option value="">{t('noTransfer')}</option>
              {wallets.map(w => <option key={w.id} value={w.id}>{w.icon} {w.name} ({formatRupiah(Number(w.balance))})</option>)}
            </select>
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 py-2.5 rounded-lg text-sm font-medium">{t('cancel')}</button>
          <button onClick={handleDelete} disabled={loading} className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-medium">
            {loading ? t('saving') : t('delete')}
          </button>
        </div>
      </div>
    </>
  );
}

function DepositForm({ saving, wallets, onSave, onClose, t }) {
  const { user } = useApp();
  const [type, setType] = useState('deposit');
  const [amount, setAmount] = useState('');
  const [walletId, setWalletId] = useState(wallets.find(w => w.is_default)?.id ?? wallets[0]?.id ?? '');
  const [adminFee, setAdminFee] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const maxWithdraw = Number(saving.current_amount);
  const remaining = Number(saving.target_amount) - Number(saving.current_amount);
  const adminFeeVal = type === 'deposit' && walletId && adminFee ? parseFloat(adminFee) || 0 : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (type === 'withdraw' && val > maxWithdraw) { setError(`Maksimal tarik: ${formatRupiah(maxWithdraw)}`); return; }
    setLoading(true); setError('');
    try {
      await createSavingsTransaction({ savings_id: saving.id, amount: val, type, note, trx_date: date });
      if (walletId) {
        const delta = type === 'deposit' ? -(val + adminFeeVal) : +val;
        await adjustWalletBalance(walletId, delta);
        if (adminFeeVal > 0) {
          await createTransaction({
            user_id: user.id, type: 'expense', amount: adminFeeVal,
            wallet_id: walletId,
            note: `admin transfer ${saving.name}`,
            trx_date: date,
            payment_method: 'transfer',
          });
        }
      }
      onSave(); onClose();
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  return (
    <>
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">{t('savingsTrx')}</h2>
        <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
      </div>
      <div className="px-5 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-100 dark:border-gray-600 flex items-center gap-3">
        <span className="text-2xl">{saving.icon}</span>
        <div>
          <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{saving.name}</p>
          <p className="text-xs text-gray-400">{formatRupiah(Number(saving.current_amount))} / {formatRupiah(Number(saving.target_amount))}</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {error && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/30 px-3 py-2 rounded-lg">{error}</p>}
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
          {[['deposit', t('deposit')], ['withdraw', t('withdraw')]].map(([v, l]) => (
            <button key={v} type="button" onClick={() => setType(v)}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${type === v ? (v === 'deposit' ? 'bg-green-500 text-white' : 'bg-orange-500 text-white') : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
              {l}
            </button>
          ))}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('amount')} (Rp)</label>
          <RupiahInput rawValue={amount} onRawChange={setAmount} className={inputCls()} required />
          {type === 'deposit' && remaining > 0 && (
            <button type="button" onClick={() => setAmount(String(Math.round(remaining)))} className="mt-1 text-xs text-green-600 hover:underline">
              {t('fillRemainder')} ({formatRupiah(remaining)})
            </button>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {type === 'deposit' ? t('fromWallet') : t('toWallet')} ({t('optional')})
          </label>
          <select value={walletId} onChange={e => setWalletId(e.target.value)} className={selectCls()}>
            <option value="">{t('walletNote')}</option>
            {wallets.map(w => <option key={w.id} value={w.id}>{w.icon} {w.name} ({formatRupiah(Number(w.balance))})</option>)}
          </select>
          {walletId && (
            <p className="text-xs text-gray-400 mt-1">
              {type === 'deposit' ? '💡 Saldo dompet akan berkurang' : '💡 Saldo dompet akan bertambah'}
            </p>
          )}
        </div>
        {type === 'deposit' && walletId && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('adminFee')} ({t('optional')})</label>
            <RupiahInput rawValue={adminFee} onRawChange={setAdminFee} className={inputCls()} />
            {adminFeeVal > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                💡 {t('adminFeeHint')}: <span className="italic">"admin transfer {saving.name}"</span>
              </p>
            )}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('date')}</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls()} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('note')}</label>
          <input value={note} onChange={e => setNote(e.target.value)} className={inputCls()} placeholder={t('optional')} />
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

function SavingsCard({ saving, transactions, wallets, onRefetch, t }) {
  const [expanded, setExpanded] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const pct = Math.min(100, (Number(saving.current_amount) / Number(saving.target_amount)) * 100);
  const history = transactions.filter(tx => tx.savings_id === saving.id);
  const statusMap = {
    active: { label: t('active'), cls: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' },
    completed: { label: t('achieved'), cls: 'bg-green-100 dark:bg-green-900/30 text-green-600' },
    cancelled: { label: t('cancelled'), cls: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400' },
  };
  const badge = statusMap[saving.status] ?? statusMap.active;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ backgroundColor: saving.color + '20' }}>
              {saving.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-800 dark:text-gray-100">{saving.name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.cls}`}>{badge.label}</span>
              </div>
              {saving.deadline && <p className="text-xs text-gray-400">{t('deadline')}: {formatDate(saving.deadline)}</p>}
              {saving.note && <p className="text-xs text-gray-400 truncate">{saving.note}</p>}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{formatRupiah(Number(saving.current_amount))}</p>
            <p className="text-xs text-gray-400">{t('from')} {formatRupiah(Number(saving.target_amount))}</p>
          </div>
        </div>
        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 mb-1.5">
          <div className="h-2.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: saving.color }} />
        </div>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{Math.round(pct)}% tercapai</span>
          <span>Sisa {formatRupiah(Math.max(0, Number(saving.target_amount) - Number(saving.current_amount)))}</span>
        </div>
      </div>
      <div className="flex border-t border-gray-50 dark:border-gray-700">
        <button onClick={() => setExpanded(v => !v)} className="flex-1 py-2.5 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center gap-1">
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />} {t('history')} ({history.length})
        </button>
        <button onClick={() => setShowEdit(true)} className="flex-1 py-2.5 text-xs text-blue-500 font-medium hover:bg-blue-50 dark:hover:bg-blue-900/30 border-l border-gray-50 dark:border-gray-700 flex items-center justify-center gap-1">
          <Pencil size={11} /> {t('edit')}
        </button>
        {saving.status === 'active' && (
          <button onClick={() => setShowDeposit(true)} className="flex-1 py-2.5 text-xs text-green-600 font-medium hover:bg-green-50 dark:hover:bg-green-900/30 border-l border-gray-50 dark:border-gray-700">
            {t('depositWithdraw')}
          </button>
        )}
        <button onClick={() => setShowDelete(true)} className="py-2.5 px-3 text-xs text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 border-l border-gray-50 dark:border-gray-700">
          <Trash2 size={13} />
        </button>
      </div>
      {expanded && history.length > 0 && (
        <div className="border-t border-gray-50 dark:border-gray-700 divide-y divide-gray-50 dark:divide-gray-700">
          {history.map(tx => (
            <div key={tx.id} className="flex items-center justify-between px-4 py-2">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-300">{tx.note || (tx.type === 'deposit' ? t('deposit') : t('withdraw'))}</p>
                <p className="text-xs text-gray-400">{formatDate(tx.trx_date)}</p>
              </div>
              <p className={`text-xs font-semibold ${tx.type === 'deposit' ? 'text-green-600' : 'text-orange-500'}`}>
                {tx.type === 'deposit' ? '+' : '-'}{formatRupiah(Number(tx.amount))}
              </p>
            </div>
          ))}
        </div>
      )}
      {showDeposit && <Modal onClose={() => setShowDeposit(false)}><DepositForm saving={saving} wallets={wallets} onSave={onRefetch} onClose={() => setShowDeposit(false)} t={t} /></Modal>}
      {showEdit && <Modal onClose={() => setShowEdit(false)}><SavingsForm initial={saving} onSave={onRefetch} onClose={() => setShowEdit(false)} t={t} /></Modal>}
      {showDelete && <Modal onClose={() => setShowDelete(false)}><DeleteSavingsModal saving={saving} wallets={wallets} onSave={onRefetch} onClose={() => setShowDelete(false)} t={t} /></Modal>}
    </div>
  );
}

export default function Savings() {
  const { user, t } = useApp();
  const { data: savings = [], loading, refetch: refetchSavings } = useQuery(fetchSavings, [user?.id]);
  const { data: transactions = [], refetch: refetchTrx } = useQuery(fetchSavingsTransactions, [user?.id]);
  const { data: wallets = [] } = useQuery(fetchWallets, [user?.id]);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('active');

  const handleRefetch = () => { refetchSavings(); refetchTrx(); };
  const filtered = savings.filter(s => filter === 'all' || s.status === filter);
  const totalSaved = savings.filter(s => s.status !== 'cancelled').reduce((s, sv) => s + Number(sv.current_amount), 0);
  const totalTarget = savings.filter(s => s.status !== 'cancelled').reduce((s, sv) => s + Number(sv.target_amount), 0);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-2 mb-2">
          <PiggyBank size={20} className="text-blue-200" />
          <p className="text-sm text-blue-100">{t('totalSaved')}</p>
        </div>
        <p className="text-3xl font-bold">{formatRupiah(totalSaved)}</p>
        {totalTarget > 0 && (
          <>
            <div className="w-full bg-blue-400/40 rounded-full h-1.5 mt-3">
              <div className="h-1.5 rounded-full bg-white" style={{ width: `${Math.min(100, (totalSaved / totalTarget) * 100)}%` }} />
            </div>
            <p className="text-xs text-blue-100 mt-1">{t('from')} {formatRupiah(totalTarget)} {t('totalSavingsTarget')}</p>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg text-xs flex-1">
          {[['active', t('active')], ['completed', t('achieved')], ['all', t('all')]].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)}
              className={`flex-1 py-1.5 rounded-md font-medium transition-colors ${filter === v ? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>{l}</button>
          ))}
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium flex-shrink-0">
          <Plus size={16} /><span className="hidden sm:inline">{t('createSavings')}</span>
        </button>
      </div>
      <div className="space-y-3">
        {filtered.length === 0
          ? <div className="bg-white dark:bg-gray-800 rounded-2xl py-12 text-center text-gray-400 text-sm border border-gray-100 dark:border-gray-700">
              {filter === 'active' ? t('noActiveSavings') : t('noData')}
            </div>
          : filtered.map(s => <SavingsCard key={s.id} saving={s} transactions={transactions} wallets={wallets} onRefetch={handleRefetch} t={t} />)
        }
      </div>
      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <SavingsForm userId={user?.id} onSave={handleRefetch} onClose={() => setShowModal(false)} t={t} />
        </Modal>
      )}
    </div>
  );
}

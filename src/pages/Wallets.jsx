import { useState } from 'react';
import { Plus, X, Pencil, Trash2, ArrowLeftRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useQuery, fetchWallets, createWallet, updateWallet, deleteWallet, adjustWalletBalance } from '../lib/useData';
import { formatRupiah } from '../data/dummyData';
import { Modal, RupiahInput, Spinner, inputCls, selectCls } from '../components/shared';

const WALLET_TYPES = [
  { value: 'cash',    label: 'Tunai',    icon: '💵' },
  { value: 'bank',    label: 'Bank',     icon: '🏦' },
  { value: 'ewallet', label: 'E-Wallet', icon: '📱' },
  { value: 'other',   label: 'Lainnya',  icon: '💳' },
];
const COLORS = ['#22c55e','#3b82f6','#f97316','#a855f7','#ef4444','#06b6d4','#84cc16','#ec4899','#1e40af','#00aed6'];

function WalletForm({ existing, userId, onSave, onClose, t }) {
  const [form, setForm] = useState({
    name: existing?.name ?? '', type: existing?.type ?? 'cash',
    balance: existing?.balance ? String(Math.round(Number(existing.balance))) : '',
    color: existing?.color ?? '#22c55e', icon: existing?.icon ?? '💵',
    is_default: existing?.is_default ?? false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTypeChange = (type) => {
    const tp = WALLET_TYPES.find(w => w.value === type);
    setForm(f => ({ ...f, type, icon: tp?.icon ?? '💳' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      if (existing) {
        const balance = form.balance !== '' ? parseFloat(form.balance) : Number(existing.balance);
        await updateWallet(existing.id, { name: form.name, type: form.type, balance, color: form.color, icon: form.icon, is_default: form.is_default });
      } else {
        const balance = form.balance ? parseFloat(form.balance) : 0;
        await createWallet({ name: form.name, type: form.type, balance, color: form.color, icon: form.icon, is_default: form.is_default, user_id: userId });
      }
      onSave(); onClose();
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  return (
    <>
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">{existing ? t('editWallet') : t('addWallet')}</h2>
        <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
      </div>
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {error && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/30 px-3 py-2 rounded-lg">{error}</p>}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('walletName')}</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls()} placeholder="BCA Utama, GoPay, ..." required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('walletType')}</label>
          <div className="grid grid-cols-4 gap-2">
            {WALLET_TYPES.map(tp => (
              <button key={tp.value} type="button" onClick={() => handleTypeChange(tp.value)}
                className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border text-xs font-medium transition-colors
                  ${form.type === tp.value ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                <span className="text-xl">{tp.icon}</span>{tp.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{existing ? t('walletBalance') : t('initialBalance')}</label>
          <RupiahInput rawValue={form.balance} onRawChange={v => setForm(f => ({ ...f, balance: v }))} className={inputCls()} />
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
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.is_default} onChange={e => setForm(f => ({ ...f, is_default: e.target.checked }))} className="w-4 h-4 rounded accent-green-500" />
          <span className="text-sm text-gray-700 dark:text-gray-300">{t('mainWallet')}</span>
        </label>
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

function TransferForm({ wallets, onSave, onClose, t }) {
  const [fromId, setFromId] = useState(wallets.find(w => w.is_default)?.id ?? wallets[0]?.id ?? '');
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (fromId === toId) { setError(t('sameWalletError')); return; }
    const val = parseFloat(amount);
    if (!val || val <= 0) { setError('Jumlah tidak valid'); return; }
    const from = wallets.find(w => w.id === fromId);
    if (Number(from?.balance) < val) { setError('Saldo tidak cukup'); return; }
    setLoading(true);
    try {
      await adjustWalletBalance(fromId, -val);
      await adjustWalletBalance(toId, +val);
      onSave(); onClose();
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  const fromWallet = wallets.find(w => w.id === fromId);

  return (
    <>
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">{t('transferTitle')}</h2>
        <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
      </div>
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {error && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/30 px-3 py-2 rounded-lg">{error}</p>}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('transferFrom')}</label>
          <select value={fromId} onChange={e => setFromId(e.target.value)} className={selectCls()} required>
            {wallets.map(w => <option key={w.id} value={w.id}>{w.icon} {w.name} ({formatRupiah(Number(w.balance))})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('transferTo')}</label>
          <select value={toId} onChange={e => setToId(e.target.value)} className={selectCls()} required>
            <option value="">Pilih dompet tujuan</option>
            {wallets.filter(w => w.id !== fromId).map(w => <option key={w.id} value={w.id}>{w.icon} {w.name} ({formatRupiah(Number(w.balance))})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('transferAmount')}</label>
          <RupiahInput rawValue={amount} onRawChange={setAmount} className={inputCls()} required />
          {fromWallet && <p className="text-xs text-gray-400 mt-1">Saldo tersedia: {formatRupiah(Number(fromWallet.balance))}</p>}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 py-2.5 rounded-lg text-sm font-medium">{t('cancel')}</button>
          <button type="submit" disabled={loading} className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-medium">
            {loading ? t('saving') : t('transfer')}
          </button>
        </div>
      </form>
    </>
  );
}

export default function Wallets() {
  const { user, t } = useApp();
  const { data: wallets = [], loading, refetch } = useQuery(fetchWallets, [user?.id]);
  const [showModal, setShowModal] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const totalBalance = wallets.reduce((s, w) => s + Number(w.balance), 0);

  const handleDelete = async (id) => {
    if (!confirm(t('deleteWalletConfirm'))) return;
    try { await deleteWallet(id); refetch(); } catch (e) { alert(e.message); }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-5 text-white">
        <p className="text-sm text-green-100 mb-1">{t('totalWalletBalance')}</p>
        <p className="text-3xl font-bold">{formatRupiah(totalBalance)}</p>
        <p className="text-xs text-green-100 mt-1">{wallets.length} dompet aktif</p>
      </div>

      <div className="flex gap-2 justify-end">
        {wallets.length >= 2 && (
          <button onClick={() => setShowTransfer(true)}
            className="flex items-center gap-1.5 border border-green-500 text-green-600 dark:text-green-400 dark:border-green-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors">
            <ArrowLeftRight size={16} /> {t('transfer')}
          </button>
        )}
        <button onClick={() => { setEditTarget(null); setShowModal(true); }}
          className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium">
          <Plus size={16} /> {t('addWallet')}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {wallets.length === 0
          ? <div className="col-span-2 bg-white dark:bg-gray-800 rounded-2xl py-12 text-center text-gray-400 text-sm border border-gray-100 dark:border-gray-700">Belum ada dompet</div>
          : wallets.map(w => (
            <div key={w.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="p-4" style={{ borderLeft: `4px solid ${w.color}` }}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ backgroundColor: w.color + '20' }}>
                      {w.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{w.name}</p>
                        {w.is_default && <span className="text-xs bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded-full">Utama</span>}
                      </div>
                      <p className="text-xs text-gray-400 capitalize">{WALLET_TYPES.find(tp => tp.value === w.type)?.label ?? w.type}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditTarget(w); setShowModal(true); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(w.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-50 dark:border-gray-700">
                  <p className="text-xs text-gray-400">Saldo</p>
                  <p className={`text-lg font-bold ${Number(w.balance) < 0 ? 'text-red-500' : 'text-gray-800 dark:text-gray-100'}`}>
                    {formatRupiah(Number(w.balance))}
                  </p>
                </div>
              </div>
            </div>
          ))}
      </div>

      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <WalletForm existing={editTarget} userId={user?.id} onSave={refetch} onClose={() => { setShowModal(false); setEditTarget(null); }} t={t} />
        </Modal>
      )}
      {showTransfer && (
        <Modal onClose={() => setShowTransfer(false)}>
          <TransferForm wallets={wallets} onSave={refetch} onClose={() => setShowTransfer(false)} t={t} />
        </Modal>
      )}
    </div>
  );
}

import { useState } from 'react';
import { Plus, X, Clock, ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useQuery, fetchDebts, fetchDebtPayments, fetchWallets, createDebt, updateDebt, deleteDebt, createDebtPayment, updateDebtPayment, deleteDebtPayment, recalcDebtRemaining, createTransaction, adjustWalletBalance } from '../lib/useData';
import { formatRupiah, formatDate } from '../data/dummyData';
import { Modal, RupiahInput, Spinner, inputCls, selectCls } from '../components/shared';

function StatusBadge({ status, t }) {
  const map = {
    unpaid: { label: t('unpaid'), cls: 'bg-red-100 dark:bg-red-900/30 text-red-600' },
    partial: { label: t('partial'), cls: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600' },
    paid: { label: t('paid'), cls: 'bg-green-100 dark:bg-green-900/30 text-green-600' },
  };
  const { label, cls } = map[status] ?? map.unpaid;
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{label}</span>;
}

function AddDebtForm({ userId, wallets, onSave, onClose, t, hasWallets }) {
  const [form, setForm] = useState({
    type: 'debt', counterparty: '', category: '',
    amount: '', due_date: '', note: '', wallet_id: '',
  });
  const [adminFee, setAdminFee] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isReceivable = form.type === 'receivable';
  const noWalletReceivable = isReceivable && !hasWallets;
  const adminFeeVal = isReceivable && form.wallet_id && adminFee ? parseFloat(adminFee) || 0 : 0;
  const today = new Date().toISOString().split('T')[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isReceivable && !form.wallet_id) { setError(t('noWalletReceivable')); return; }
    setLoading(true);
    try {
      const amount = parseFloat(form.amount);
      await createDebt({
        type: form.type, counterparty: form.counterparty, category: form.category || null,
        amount, remaining: amount, due_date: form.due_date || null,
        note: form.note || null, wallet_id: form.wallet_id || null, user_id: userId,
      });
      if (form.wallet_id) {
        const noteTrx = `${form.type === 'debt' ? 'Hutang dari' : 'Piutang ke'} ${form.counterparty}${form.category ? ` — ${form.category}` : ''}`;
        await createTransaction({
          user_id: userId, wallet_id: form.wallet_id,
          type: form.type === 'debt' ? 'income' : 'expense',
          amount, trx_date: today, note: noteTrx, category_id: null,
        });
        if (adminFeeVal > 0) {
          await createTransaction({
            user_id: userId, type: 'expense', amount: adminFeeVal,
            wallet_id: form.wallet_id,
            note: `admin transfer ${form.counterparty}`,
            trx_date: today, payment_method: 'transfer',
          });
        }
      }
      onSave(); onClose();
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  return (
    <>
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">{t('recordDebt')}</h2>
        <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
      </div>
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {error && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/30 px-3 py-2 rounded-lg">{error}</p>}
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
          {[['debt', t('debtType')], ['receivable', t('receivableType')]].map(([v, l]) => (
            <button key={v} type="button" onClick={() => setForm(f => ({ ...f, type: v }))}
              className={`flex-1 py-2 text-xs font-medium px-2 transition-colors
                ${form.type === v ? (v === 'debt' ? 'bg-red-500 text-white' : 'bg-green-500 text-white') : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>{l}</button>
          ))}
        </div>
        {noWalletReceivable && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3">
            <p className="text-xs text-amber-700 dark:text-amber-400">{t('noWalletReceivable')}{' '}
              <Link to="/wallets" onClick={onClose} className="underline font-medium">{t('addWallet')}</Link>
            </p>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('counterparty')}</label>
          <input value={form.counterparty} onChange={e => setForm(f => ({ ...f, counterparty: e.target.value }))} className={inputCls()} placeholder="Nama orang / lembaga" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('debtCategory')}</label>
          <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inputCls()} placeholder="cth: Modal usaha, Kebutuhan rumah (opsional)" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('amount')} (Rp)</label>
          <RupiahInput rawValue={form.amount} onRawChange={v => setForm(f => ({ ...f, amount: v }))} className={inputCls()} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('wallet')}</label>
          <select value={form.wallet_id} onChange={e => setForm(f => ({ ...f, wallet_id: e.target.value }))} className={selectCls()}>
            <option value="">{t('walletNote')}</option>
            {wallets.map(w => <option key={w.id} value={w.id}>{w.icon} {w.name}</option>)}
          </select>
          {form.wallet_id && (
            <p className="text-xs text-gray-400 mt-1">
              {form.type === 'debt' ? t('debtWalletHint') : t('receivableWalletHint')}
            </p>
          )}
        </div>
        {isReceivable && form.wallet_id && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('adminFee')} ({t('optional')})</label>
            <RupiahInput rawValue={adminFee} onRawChange={setAdminFee} className={inputCls()} />
            {adminFeeVal > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                💡 {t('adminFeeHint')}: <span className="italic">"admin transfer {form.counterparty || '...'}"</span>
              </p>
            )}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('dueDate')}</label>
          <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className={inputCls()} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('note')}</label>
          <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} className={inputCls()} placeholder={t('optional')} />
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 py-2.5 rounded-lg text-sm font-medium">{t('cancel')}</button>
          <button type="submit" disabled={loading || noWalletReceivable}
            className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-medium">
            {loading ? t('saving') : t('save')}
          </button>
        </div>
      </form>
    </>
  );
}

function DebtEditForm({ debt, onSave, onClose, t }) {
  const [form, setForm] = useState({
    counterparty: debt.counterparty, category: debt.category ?? '',
    due_date: debt.due_date ?? '', note: debt.note ?? '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await updateDebt(debt.id, {
        counterparty: form.counterparty, category: form.category || null,
        due_date: form.due_date || null, note: form.note || null,
      });
      onSave(); onClose();
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  return (
    <>
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">{t('editDebt')}</h2>
        <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
      </div>
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {error && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/30 px-3 py-2 rounded-lg">{error}</p>}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('counterparty')}</label>
          <input value={form.counterparty} onChange={e => setForm(f => ({ ...f, counterparty: e.target.value }))} className={inputCls()} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('debtCategory')}</label>
          <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inputCls()} placeholder={t('optional')} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('dueDate')}</label>
          <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className={inputCls()} />
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

function PaymentForm({ debt, wallets, onSave, onClose, t }) {
  const { user } = useApp();
  const [amount, setAmount] = useState('');
  const [walletId, setWalletId] = useState(wallets.find(w => w.is_default)?.id ?? wallets[0]?.id ?? '');
  const [adminFee, setAdminFee] = useState('');
  const [interest, setInterest] = useState('');
  const [loanInterest, setLoanInterest] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const adminFeeVal = adminFee ? parseFloat(adminFee) || 0 : 0;
  const interestVal = interest ? parseFloat(interest) || 0 : 0;
  const loanInterestVal = loanInterest ? parseFloat(loanInterest) || 0 : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!val || val > Number(debt.remaining)) { setError('Jumlah tidak valid'); return; }
    setLoading(true);
    try {
      await createDebtPayment({ debt_id: debt.id, amount: val, pay_date: date, note });
      if (walletId) {
        const delta = debt.type === 'debt' ? -val : +val;
        await adjustWalletBalance(walletId, delta);
        if (adminFeeVal > 0) {
          await createTransaction({
            user_id: user.id, type: 'expense', amount: adminFeeVal,
            wallet_id: walletId,
            note: `admin transfer ${debt.counterparty}`,
            trx_date: date, payment_method: 'transfer',
          });
        }
        if (interestVal > 0) {
          await createTransaction({
            user_id: user.id, type: 'expense', amount: interestVal,
            wallet_id: walletId,
            note: `bunga hutang ${debt.counterparty}`,
            trx_date: date, payment_method: 'transfer',
          });
        }
        if (loanInterestVal > 0) {
          await createTransaction({
            user_id: user.id, type: 'income', amount: loanInterestVal,
            wallet_id: walletId,
            note: `bunga pinjaman ${debt.counterparty}`,
            trx_date: date, payment_method: 'transfer',
          });
        }
      }
      onSave(); onClose();
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  return (
    <>
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">{t('recordPayment')}</h2>
        <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
      </div>
      <div className="px-5 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-100 dark:border-gray-600">
        <p className="text-xs text-gray-500 dark:text-gray-400">{debt.type === 'debt' ? 'Hutang ke' : 'Piutang dari'}</p>
        <p className="font-semibold text-gray-800 dark:text-gray-100">{debt.counterparty}</p>
        {debt.category && <p className="text-xs text-gray-400">{debt.category}</p>}
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('remaining')}: <span className="font-medium text-orange-500">{formatRupiah(Number(debt.remaining))}</span></p>
      </div>
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {error && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/30 px-3 py-2 rounded-lg">{error}</p>}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('amount')} (Rp)</label>
          <RupiahInput rawValue={amount} onRawChange={setAmount} className={inputCls()} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('paymentWallet')}</label>
          <select value={walletId} onChange={e => setWalletId(e.target.value)} className={selectCls()}>
            <option value="">{t('walletNote')}</option>
            {wallets.map(w => <option key={w.id} value={w.id}>{w.icon} {w.name} ({formatRupiah(Number(w.balance))})</option>)}
          </select>
          {walletId && (
            <p className="text-xs text-gray-400 mt-1">
              {debt.type === 'debt' ? t('debtPayWalletHint') : t('receivablePayWalletHint')}
            </p>
          )}
        </div>
        {walletId && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('adminFee')} ({t('optional')})</label>
              <RupiahInput rawValue={adminFee} onRawChange={setAdminFee} className={inputCls()} />
              {adminFeeVal > 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  💡 {t('adminFeeHint')}: <span className="italic">"admin transfer {debt.counterparty}"</span>
                </p>
              )}
            </div>
            {debt.type === 'debt' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('debtInterest')} ({t('optional')})</label>
                <RupiahInput rawValue={interest} onRawChange={setInterest} className={inputCls()} />
                {interestVal > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    💡 {t('adminFeeHint')}: <span className="italic">"bunga hutang {debt.counterparty}"</span>
                  </p>
                )}
              </div>
            )}
            {debt.type === 'receivable' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('loanInterest')} ({t('optional')})</label>
                <RupiahInput rawValue={loanInterest} onRawChange={setLoanInterest} className={inputCls()} />
                {loanInterestVal > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    💡 Dicatat sebagai pemasukan: <span className="italic">"bunga pinjaman {debt.counterparty}"</span>
                  </p>
                )}
              </div>
            )}
          </>
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
          <button type="button" onClick={() => setAmount(String(Math.round(Number(debt.remaining))))}
            className="flex-1 border border-green-500 text-green-600 py-2.5 rounded-lg text-sm font-medium hover:bg-green-50 dark:hover:bg-green-900/30">{t('payFull')}</button>
          <button type="submit" disabled={loading} className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-medium">
            {loading ? t('saving') : t('save')}
          </button>
        </div>
      </form>
    </>
  );
}

function PaymentEditForm({ payment, debt, onSave, onClose, t }) {
  const [amount, setAmount] = useState(String(Math.round(Number(payment.amount))));
  const [date, setDate] = useState(payment.pay_date ?? new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState(payment.note ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!val || val <= 0) { setError('Jumlah tidak valid'); return; }
    setLoading(true);
    try {
      await updateDebtPayment(payment.id, { amount: val, pay_date: date, note: note || null });
      await recalcDebtRemaining(debt.id, debt.amount);
      onSave(); onClose();
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  return (
    <>
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">{t('editPayment')}</h2>
        <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
      </div>
      <div className="px-5 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-100 dark:border-gray-600">
        <p className="text-xs text-gray-500 dark:text-gray-400">{debt.type === 'debt' ? 'Hutang ke' : 'Piutang dari'}</p>
        <p className="font-semibold text-gray-800 dark:text-gray-100">{debt.counterparty}</p>
      </div>
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {error && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/30 px-3 py-2 rounded-lg">{error}</p>}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-lg px-3 py-2">
          <p className="text-xs text-amber-700 dark:text-amber-400">⚠️ {t('editPaymentNote')}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('amount')} (Rp)</label>
          <RupiahInput rawValue={amount} onRawChange={setAmount} className={inputCls()} required />
        </div>
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

function DebtCard({ debt, payments, wallets, onRefetch, t }) {
  const [expanded, setExpanded] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editPayment, setEditPayment] = useState(null);
  const debtPayments = payments.filter(p => p.debt_id === debt.id);
  const progress = ((Number(debt.amount) - Number(debt.remaining)) / Number(debt.amount)) * 100;
  const isDebt = debt.type === 'debt';

  const handleDelete = async () => {
    if (!confirm(t('deleteDebt'))) return;
    try { await deleteDebt(debt.id); onRefetch(); } catch (e) { alert(e.message); }
  };

  const handleDeletePayment = async (payment) => {
    if (!confirm(t('deletePaymentConfirm'))) return;
    try {
      await deleteDebtPayment(payment.id);
      await recalcDebtRemaining(debt.id, debt.amount);
      onRefetch();
    } catch (e) { alert(e.message); }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isDebt ? 'bg-red-100 dark:bg-red-900/30 text-red-600' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'}`}>
                {isDebt ? t('debt') : t('receivable')}
              </span>
              <StatusBadge status={debt.status} t={t} />
            </div>
            <p className="font-semibold text-gray-800 dark:text-gray-100 mt-1">{debt.counterparty}</p>
            {debt.category && <span className="inline-block text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full mt-0.5">{debt.category}</span>}
            {debt.note && <p className="text-xs text-gray-400 mt-0.5 truncate">{debt.note}</p>}
          </div>
          <div className="text-right flex-shrink-0">
            <p className={`font-bold text-base ${isDebt ? 'text-red-500' : 'text-green-600'}`}>{formatRupiah(Number(debt.remaining))}</p>
            <p className="text-xs text-gray-400">{t('from')} {formatRupiah(Number(debt.amount))}</p>
          </div>
        </div>
        <div className="mt-3 w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
          <div className={`h-1.5 rounded-full ${isDebt ? 'bg-red-400' : 'bg-green-500'}`} style={{ width: `${Math.min(100, progress)}%` }} />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-xs text-gray-400 flex items-center gap-1"><Clock size={10} />{debt.due_date ? formatDate(debt.due_date) : '—'}</p>
          <p className="text-xs text-gray-400">{Math.round(progress)}% terbayar</p>
        </div>
        {debt.created_at && (
          <p className="text-xs text-gray-400 mt-0.5 italic">{t('createdAt')}: {formatDate(debt.created_at)}</p>
        )}
      </div>
      <div className="flex border-t border-gray-50 dark:border-gray-700">
        <button onClick={() => setExpanded(v => !v)} className="flex-1 py-2.5 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center gap-1">
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />} {t('history')} ({debtPayments.length})
        </button>
        <button onClick={() => setShowEdit(true)} className="flex-1 py-2.5 text-xs text-blue-500 font-medium hover:bg-blue-50 dark:hover:bg-blue-900/30 border-l border-gray-50 dark:border-gray-700 flex items-center justify-center gap-1">
          <Pencil size={11} /> {t('edit')}
        </button>
        {debt.status !== 'paid' && (
          <button onClick={() => setShowPay(true)} className="flex-1 py-2.5 text-xs text-green-600 font-medium hover:bg-green-50 dark:hover:bg-green-900/30 border-l border-gray-50 dark:border-gray-700">
            + {t('recordPayment')}
          </button>
        )}
        <button onClick={handleDelete} className="py-2.5 px-3 text-xs text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 border-l border-gray-50 dark:border-gray-700">
          <Trash2 size={13} />
        </button>
      </div>
      {expanded && debtPayments.length > 0 && (
        <div className="border-t border-gray-50 dark:border-gray-700 divide-y divide-gray-50 dark:divide-gray-700">
          {debtPayments.map(p => (
            <div key={p.id} className="flex items-center justify-between px-4 py-2.5 gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-600 dark:text-gray-300 truncate">{p.note || 'Pembayaran'}</p>
                <p className="text-xs text-gray-400">{formatDate(p.pay_date)}</p>
              </div>
              <p className="text-xs font-semibold text-green-600 flex-shrink-0">{formatRupiah(Number(p.amount))}</p>
              <div className="flex gap-0.5 flex-shrink-0">
                <button onClick={() => setEditPayment(p)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-300 hover:text-gray-500 transition-colors">
                  <Pencil size={11} />
                </button>
                <button onClick={() => handleDeletePayment(p)}
                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-300 hover:text-red-500 transition-colors">
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {showPay && <Modal onClose={() => setShowPay(false)}><PaymentForm debt={debt} wallets={wallets} onSave={onRefetch} onClose={() => setShowPay(false)} t={t} /></Modal>}
      {showEdit && <Modal onClose={() => setShowEdit(false)}><DebtEditForm debt={debt} onSave={onRefetch} onClose={() => setShowEdit(false)} t={t} /></Modal>}
      {editPayment && <Modal onClose={() => setEditPayment(null)}><PaymentEditForm payment={editPayment} debt={debt} onSave={onRefetch} onClose={() => setEditPayment(null)} t={t} /></Modal>}
    </div>
  );
}

export default function Debts() {
  const { user, t } = useApp();
  const { data: debts = [], loading, refetch: refetchDebts } = useQuery(fetchDebts, [user?.id]);
  const { data: payments = [], refetch: refetchPayments } = useQuery(fetchDebtPayments, [user?.id]);
  const { data: wallets = [] } = useQuery(fetchWallets, [user?.id]);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const handleRefetch = () => { refetchDebts(); refetchPayments(); };

  const filtered = debts.filter(d => {
    if (activeTab === 'active') return d.status !== 'paid';
    if (activeTab === 'debt') return d.type === 'debt';
    if (activeTab === 'receivable') return d.type === 'receivable';
    return true;
  });

  const totalDebt = debts.filter(d => d.type === 'debt' && d.status !== 'paid').reduce((s, d) => s + Number(d.remaining), 0);
  const totalReceivable = debts.filter(d => d.type === 'receivable' && d.status !== 'paid').reduce((s, d) => s + Number(d.remaining), 0);
  const hasWallets = wallets.length > 0;

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3"><p className="text-xs text-gray-500 dark:text-gray-400">{t('totalDebt')}</p><p className="text-base font-bold text-red-500">{formatRupiah(totalDebt)}</p></div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3"><p className="text-xs text-gray-500 dark:text-gray-400">{t('totalReceivable')}</p><p className="text-base font-bold text-green-600">{formatRupiah(totalReceivable)}</p></div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg text-xs flex-1">
          {[['all', t('all')], ['active', t('active')], ['debt', t('debt')], ['receivable', t('receivable')]].map(([v, l]) => (
            <button key={v} onClick={() => setActiveTab(v)}
              className={`flex-1 py-1.5 rounded-md font-medium transition-colors ${activeTab === v ? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>{l}</button>
          ))}
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium">
          <Plus size={16} /><span className="hidden sm:inline">{t('add')}</span>
        </button>
      </div>
      <div className="space-y-3">
        {filtered.length === 0
          ? <div className="bg-white dark:bg-gray-800 rounded-2xl py-12 text-center text-gray-400 text-sm border border-gray-100 dark:border-gray-700">{t('noData')}</div>
          : filtered.map(d => <DebtCard key={d.id} debt={d} payments={payments} wallets={wallets} onRefetch={handleRefetch} t={t} />)
        }
      </div>
      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <AddDebtForm userId={user?.id} wallets={wallets} hasWallets={hasWallets} onSave={handleRefetch} onClose={() => setShowModal(false)} t={t} />
        </Modal>
      )}
    </div>
  );
}

import { useState } from 'react';
import { User, Lock, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { insforge } from '../lib/insforge';

function Section({ title, icon: Icon, children }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-gray-700">
        <Icon size={18} className="text-green-500" />
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Alert({ type, msg }) {
  if (!msg) return null;
  const isError = type === 'error';
  return (
    <div className={`flex items-center gap-2 text-sm px-3 py-2.5 rounded-lg mb-4 ${isError ? 'bg-red-50 dark:bg-red-900/30 text-red-600 border border-red-200 dark:border-red-700' : 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-700'}`}>
      {isError ? <AlertCircle size={15} /> : <CheckCircle size={15} />}
      {msg}
    </div>
  );
}

export default function Profile() {
  const { user, logout, deleteAccount, t } = useApp();
  const displayName = user?.profile?.name ?? user?.email?.split('@')[0] ?? '';

  const [name, setName] = useState(displayName);
  const [nameLoading, setNameLoading] = useState(false);
  const [nameMsg, setNameMsg] = useState({ type: '', msg: '' });

  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState({ type: '', msg: '' });

  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState({ type: '', msg: '' });

  const ic = `w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500`;

  const handleSaveName = async (e) => {
    e.preventDefault(); setNameLoading(true); setNameMsg({ type: '', msg: '' });
    try {
      const { error } = await insforge.auth.setProfile({ name: name.trim() });
      if (error) throw new Error(error.message);
      setNameMsg({ type: 'success', msg: 'Nama berhasil diperbarui.' });
    } catch (err) { setNameMsg({ type: 'error', msg: err.message }); } finally { setNameLoading(false); }
  };

  const handleSendReset = async () => {
    setResetLoading(true); setResetMsg({ type: '', msg: '' });
    try {
      const { error } = await insforge.auth.sendResetPasswordEmail({ email: user.email, redirectTo: window.location.origin + '/login' });
      if (error) throw new Error(error.message);
      setResetMsg({ type: 'success', msg: `${t('resetSent')} — ${t('checkEmail')}` });
    } catch (err) { setResetMsg({ type: 'error', msg: err.message }); } finally { setResetLoading(false); }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') return;
    setDeleteLoading(true); setDeleteMsg({ type: '', msg: '' });
    const res = await deleteAccount();
    if (res.error) { setDeleteMsg({ type: 'error', msg: res.error }); setDeleteLoading(false); }
  };

  return (
    <div className="max-w-lg space-y-4">
      {/* Avatar */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 flex items-center gap-4">
        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
          {(user?.email?.[0] ?? '?').toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-gray-800 dark:text-gray-100 text-lg">{displayName}</p>
          <p className="text-sm text-gray-400">{user?.email}</p>
        </div>
      </div>

      {/* Edit nama */}
      <Section title={t('editProfile')} icon={User}>
        <Alert {...nameMsg} />
        <form onSubmit={handleSaveName} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('displayName')}</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className={ic} placeholder="Nama kamu" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('email')}</label>
            <input type="email" value={user?.email ?? ''} disabled className={`${ic} bg-gray-50 dark:bg-gray-700/50 cursor-not-allowed opacity-60`} />
          </div>
          <button type="submit" disabled={nameLoading}
            className="bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
            {nameLoading ? t('saving') : t('save')}
          </button>
        </form>
      </Section>

      {/* Ganti password */}
      <Section title={t('changePassword')} icon={Lock}>
        <Alert {...resetMsg} />
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Klik tombol di bawah untuk mendapatkan kode reset password via email ke <strong>{user?.email}</strong>.
        </p>
        <button onClick={handleSendReset} disabled={resetLoading}
          className="border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-60 text-gray-700 dark:text-gray-300 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
          {resetLoading ? t('saving') : t('sendReset')}
        </button>
      </Section>

      {/* Logout */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('logout')}</p>
        <p className="text-xs text-gray-400 mb-3">{t('logoutDesc')}</p>
        <button onClick={logout} className="bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 border border-red-200 dark:border-red-700 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
          {t('logout')}
        </button>
      </div>

      {/* Delete account */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-red-200 dark:border-red-800 p-5">
        <div className="flex items-center gap-2 mb-2">
          <Trash2 size={16} className="text-red-500" />
          <p className="text-sm font-semibold text-red-600 dark:text-red-400">{t('deleteAccount')}</p>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{t('deleteAccountDesc')}</p>
        <Alert {...deleteMsg} />
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">{t('deleteAccountConfirm')}</label>
            <input type="text" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
              className="w-full border border-red-200 dark:border-red-700 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              placeholder="DELETE" />
          </div>
          <button onClick={handleDeleteAccount} disabled={deleteLoading || deleteConfirm !== 'DELETE'}
            className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
            {deleteLoading ? t('saving') : t('deleteAccountBtn')}
          </button>
        </div>
      </div>
    </div>
  );
}

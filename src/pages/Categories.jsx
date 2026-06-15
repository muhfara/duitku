import { useState } from 'react';
import { Plus, X, Pencil, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useQuery, fetchCategories, createCategory, updateCategory, deleteCategory } from '../lib/useData';
import { Modal, Spinner, inputCls } from '../components/shared';

const COLORS = ['#22c55e','#3b82f6','#f97316','#a855f7','#ef4444','#06b6d4','#84cc16','#ec4899','#1e40af','#64748b'];

function CategoryForm({ existing, userId, onSave, onClose, t }) {
  const [form, setForm] = useState({
    name: existing?.name ?? '',
    type: existing?.type ?? 'expense',
    icon: existing?.icon ?? '📦',
    color: existing?.color ?? '#64748b',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      if (existing) {
        await updateCategory(existing.id, { name: form.name, type: form.type, icon: form.icon, color: form.color });
      } else {
        await createCategory({ name: form.name, type: form.type, icon: form.icon, color: form.color, user_id: userId });
      }
      onSave(); onClose();
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  return (
    <>
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">{existing ? t('editCategory') : t('addCategory')}</h2>
        <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
      </div>
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {error && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/30 px-3 py-2 rounded-lg">{error}</p>}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('categoryName')}</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls()} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('walletType')}</label>
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
            {['expense', 'income'].map(tp => (
              <button key={tp} type="button"
                onClick={() => setForm(f => ({ ...f, type: tp }))}
                className={`flex-1 py-2 text-sm font-medium transition-colors
                  ${form.type === tp
                    ? (tp === 'expense' ? 'bg-red-500 text-white' : 'bg-green-500 text-white')
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}>
                {tp === 'expense' ? t('expense') : t('income')}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('categoryIcon')}</label>
            <input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} className={inputCls()} maxLength={4} />
          </div>
          <div className="flex justify-center pb-1">
            <span className="text-5xl leading-none">{form.icon}</span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('categoryColor')}</label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map(c => (
              <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c ? 'border-gray-800 dark:border-gray-100 scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
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

export default function Categories() {
  const { user, t } = useApp();
  const { data: categories = [], loading, refetch } = useQuery(fetchCategories, [user?.id]);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [activeTab, setActiveTab] = useState('expense');

  const filtered = categories.filter(c => c.type === activeTab);

  const handleDelete = async (id) => {
    if (!confirm(t('deleteCategoryConfirm'))) return;
    try { await deleteCategory(id); refetch(); } catch (e) { alert(e.message); }
  };

  const closeModal = () => { setShowModal(false); setEditTarget(null); };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden bg-white dark:bg-gray-800">
        {['expense', 'income'].map(tp => (
          <button key={tp} type="button"
            onClick={() => setActiveTab(tp)}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors
              ${activeTab === tp
                ? (tp === 'expense' ? 'bg-red-500 text-white' : 'bg-green-500 text-white')
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}>
            {tp === 'expense' ? t('expense') : t('income')}
          </button>
        ))}
      </div>

      <div className="flex justify-end">
        <button onClick={() => { setEditTarget(null); setShowModal(true); }}
          className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium">
          <Plus size={16} /> {t('addCategory')}
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        {filtered.length === 0
          ? <div className="py-12 text-center text-gray-400 text-sm">{t('noCategoryData')}</div>
          : (
            <div className="divide-y divide-gray-50 dark:divide-gray-700">
              {filtered.map(cat => (
                <div key={cat.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 group">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ backgroundColor: cat.color + '20' }}>
                    {cat.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{cat.name}</p>
                    {cat.is_default && <p className="text-xs text-gray-400">Default</p>}
                  </div>
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => { setEditTarget(cat); setShowModal(true); }}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(cat.id)}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>

      {showModal && (
        <Modal onClose={closeModal}>
          <CategoryForm existing={editTarget} userId={user?.id} onSave={refetch} onClose={closeModal} t={t} />
        </Modal>
      )}
    </div>
  );
}

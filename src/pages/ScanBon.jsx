import { useState, useRef } from 'react';
import { Upload, ScanLine, Check, RefreshCw, Info } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useQuery, fetchCategories, createTransaction } from '../lib/useData';
import { formatRupiah } from '../data/dummyData';

const DUMMY_RESULTS = [
  {
    store: 'Indomaret', date: new Date().toISOString().split('T')[0],
    total: 87500, category_id: 'c1',
    items: ['Air mineral 6pcs Rp 24.000', 'Roti tawar Rp 18.500', 'Susu UHT Rp 45.000'],
  },
  {
    store: 'Alfamart', date: new Date().toISOString().split('T')[0],
    total: 42000, category_id: 'c1',
    items: ['Mie instan 5pcs Rp 17.000', 'Kopi sachet Rp 12.000', 'Snack Rp 13.000'],
  },
  {
    store: 'SPBU Pertamina', date: new Date().toISOString().split('T')[0],
    total: 50000, category_id: 'c2',
    items: ['Pertalite 4.0L Rp 50.000'],
  },
];

export default function ScanBon() {
  const { user } = useApp();
  const { data: categories = [] } = useQuery(fetchCategories, [user?.id]);
  const [stage, setStage] = useState('idle'); // idle | scanning | result | done
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [form, setForm] = useState(null);
  const fileRef = useRef();

  const handleFile = (file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    setStage('scanning');

    setTimeout(() => {
      const dummy = DUMMY_RESULTS[Math.floor(Math.random() * DUMMY_RESULTS.length)];
      // Map dummy category name to actual user category
      const matchCat = categories.find(c => c.type === 'expense');
      setResult(dummy);
      setForm({
        type: 'expense',
        amount: String(dummy.total),
        category_id: matchCat?.id ?? '',
        trx_date: dummy.date,
        payment_method: 'tunai',
        note: dummy.store,
      });
      setStage('result');
    }, 2500);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) handleFile(file);
  };

  const handleSave = async () => {
    try {
      await createTransaction({ ...form, amount: parseFloat(form.amount), user_id: user?.id });
      setStage('done');
    } catch (e) {
      alert('Gagal menyimpan: ' + e.message);
    }
  };

  const reset = () => {
    setStage('idle');
    setPreview(null);
    setResult(null);
    setForm(null);
  };

  const expCats = categories.filter((c) => c.type === 'expense');

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Info banner */}
      <div className="flex gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
        <Info size={14} className="flex-shrink-0 mt-0.5" />
        <p>Fitur ini mensimulasikan scan bon dengan AI/OCR. Pada implementasi nyata, gambar bon akan diproses Gemini API untuk mengekstrak data secara otomatis.</p>
      </div>

      {stage === 'idle' && (
        <div
          className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center hover:border-green-400 transition-colors cursor-pointer"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ScanLine size={32} className="text-green-500" />
          </div>
          <p className="font-semibold text-gray-800 mb-1">Foto atau Upload Bon</p>
          <p className="text-sm text-gray-400 mb-4">Drag & drop atau klik untuk pilih gambar</p>
          <button className="bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 mx-auto">
            <Upload size={16} />
            Pilih Gambar
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files[0])}
          />
        </div>
      )}

      {stage === 'scanning' && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {preview && (
            <img src={preview} alt="Bon" className="w-full max-h-48 object-cover" />
          )}
          <div className="p-8 text-center">
            <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="font-medium text-gray-700">Membaca bon...</p>
            <p className="text-sm text-gray-400 mt-1">AI sedang mengekstrak informasi</p>
          </div>
        </div>
      )}

      {stage === 'result' && result && form && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {preview && (
              <img src={preview} alt="Bon" className="w-full max-h-40 object-cover" />
            )}
            <div className="p-4 border-b border-gray-50">
              <div className="flex items-center gap-2 text-green-600 text-sm font-medium mb-1">
                <Check size={16} />
                Bon berhasil dibaca
              </div>
              <p className="text-xs text-gray-500">Periksa dan koreksi data sebelum disimpan</p>
            </div>

            {/* AI result preview */}
            <div className="p-4 bg-gray-50 border-b border-gray-100">
              <p className="text-xs font-medium text-gray-600 mb-2">Hasil baca AI:</p>
              <p className="text-sm font-semibold text-gray-800">{result.store}</p>
              <div className="mt-1 space-y-0.5">
                {result.items.map((item, i) => (
                  <p key={i} className="text-xs text-gray-500">{item}</p>
                ))}
              </div>
              <p className="text-sm font-bold text-gray-800 mt-2">Total: {formatRupiah(result.total)}</p>
            </div>

            {/* Editable form */}
            <div className="p-4 space-y-3">
              <p className="text-xs font-medium text-gray-600 mb-2">Konfirmasi / Koreksi:</p>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Nominal (Rp)</label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Kategori</label>
                <select
                  value={form.category_id}
                  onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {expCats.map((c) => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={form.trx_date}
                    onChange={(e) => setForm((f) => ({ ...f, trx_date: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Metode</label>
                  <select
                    value={form.payment_method}
                    onChange={(e) => setForm((f) => ({ ...f, payment_method: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {['tunai', 'transfer', 'ewallet'].map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Catatan</label>
                <input
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={reset} className="flex items-center gap-1.5 border border-gray-200 text-gray-600 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">
              <RefreshCw size={14} />
              Scan Ulang
            </button>
            <button
              onClick={handleSave}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              Simpan Transaksi
            </button>
          </div>
        </div>
      )}

      {stage === 'done' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-green-500" />
          </div>
          <p className="font-semibold text-gray-800 mb-1">Transaksi Tersimpan!</p>
          <p className="text-sm text-gray-400 mb-5">Bon berhasil dicatat ke transaksi</p>
          <button
            onClick={reset}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium"
          >
            Scan Bon Lain
          </button>
        </div>
      )}
    </div>
  );
}

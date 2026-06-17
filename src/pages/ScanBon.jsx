import { useState, useRef } from 'react';
import { Upload, ScanLine, Check, RefreshCw, AlertCircle, KeyRound, Wallet } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useQuery, fetchCategories, fetchWallets, createTransaction } from '../lib/useData';
import { formatRupiah } from '../data/dummyData';
import { RupiahInput, inputCls, selectCls } from '../components/shared';

const WALLET_TYPE_TO_PAYMENT = { cash: 'cash', bank: 'transfer', ewallet: 'ewallet', other: 'cash' };

function getPaymentFromWallet(walletId, wallets) {
  const w = wallets.find(w => w.id === walletId);
  return WALLET_TYPE_TO_PAYMENT[w?.type] ?? 'cash';
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function analyzeReceipt(imageBase64, mediaType, categories) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error('NO_API_KEY');

  const catList = categories
    .filter(c => c.type === 'expense')
    .map(c => `${c.id}: ${c.name}`)
    .join('\n');

  const prompt = `Kamu adalah asisten analisis struk belanja Indonesia. Analisa gambar struk/bon ini.

Kategori pengeluaran yang tersedia (gunakan id-nya):
${catList || '(tidak ada kategori)'}

Ekstrak informasi dari struk dan kembalikan HANYA JSON valid berikut (tanpa markdown, tanpa kode blok, tanpa teks lain):
{"store_name":"nama toko","date":"YYYY-MM-DD","total_amount":0,"items":[{"name":"item","price":0}],"category_id":"","note":"catatan singkat"}

Gunakan tanggal hari ini jika tidak terbaca. Jika struk tidak jelas, tetap berikan estimasi terbaik.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: mediaType, data: imageBase64 } },
            { text: prompt },
          ],
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 1024, responseMimeType: 'application/json' },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message ?? `API error ${res.status}`);
  }

  const data = await res.json();

  // Gabungkan semua parts (thinking model bisa punya multiple parts)
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map(p => p.text ?? '').join('').trim();

  if (!text) throw new Error('AI tidak memberikan respons. Coba lagi.');

  // Cari JSON object dalam teks (bisa terbungkus markdown atau teks lain)
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`Respons AI tidak mengandung data JSON. Respons: ${text.slice(0, 100)}`);

  try {
    return JSON.parse(match[0]);
  } catch {
    throw new Error('Format JSON dari AI tidak valid. Coba foto ulang dengan gambar lebih jelas.');
  }
}

export default function ScanBon() {
  const { user, t, lang } = useApp();
  const { data: categories = [] } = useQuery(fetchCategories, [user?.id]);
  const { data: wallets = [] } = useQuery(fetchWallets, [user?.id]);

  const [stage, setStage] = useState('idle'); // idle | scanning | result | done
  const [preview, setPreview] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [form, setForm] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  const hasApiKey = !!import.meta.env.VITE_GEMINI_API_KEY;
  const expCats = categories.filter(c => c.type === 'expense');
  const defaultWallet = wallets.find(w => w.is_default) ?? wallets[0];

  const handleFile = async (file) => {
    if (!file) return;
    setError(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    setStage('scanning');

    try {
      const mediaType = file.type || 'image/jpeg';
      const base64 = await fileToBase64(file);
      const ai = await analyzeReceipt(base64, mediaType, categories);

      setAiResult(ai);

      const walletId = defaultWallet?.id ?? '';
      setForm({
        amount: String(Math.round(ai.total_amount ?? 0)),
        category_id: ai.category_id ?? expCats[0]?.id ?? '',
        trx_date: ai.date ?? new Date().toISOString().slice(0, 10),
        note: ai.note ?? ai.store_name ?? '',
        wallet_id: walletId,
        payment_method: getPaymentFromWallet(walletId, wallets),
        type: 'expense',
      });
      setStage('result');
    } catch (e) {
      if (e.message === 'NO_API_KEY') {
        setStage('idle');
        setPreview(null);
        setError('NO_API_KEY');
      } else {
        setStage('idle');
        setPreview(null);
        setError(e.message);
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) handleFile(file);
  };

  const handleWalletChange = (walletId) => {
    setForm(f => ({
      ...f,
      wallet_id: walletId,
      payment_method: getPaymentFromWallet(walletId, wallets),
    }));
  };

  const handleSave = async () => {
    if (!form.wallet_id) { setError('Pilih kantong terlebih dahulu'); return; }
    setSaving(true);
    setError(null);
    try {
      await createTransaction({
        type: form.type,
        amount: parseFloat(form.amount) || 0,
        category_id: form.category_id || null,
        wallet_id: form.wallet_id,
        payment_method: form.payment_method,
        trx_date: form.trx_date,
        note: form.note,
        user_id: user?.id,
      });
      setStage('done');
    } catch (e) {
      setError('Gagal menyimpan: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setStage('idle');
    setPreview(null);
    setAiResult(null);
    setForm(null);
    setError(null);
  };

  const ic = inputCls();
  const sc = selectCls();

  return (
    <div className="max-w-lg mx-auto space-y-4">

      {/* API Key not configured */}
      {!hasApiKey && stage === 'idle' && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <KeyRound size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">API Key belum dikonfigurasi</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mb-2">
                Tambahkan Gemini API Key (gratis) ke file <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">.env</code>:
              </p>
              <code className="block text-xs bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 px-3 py-2 rounded-lg font-mono break-all">
                VITE_GEMINI_API_KEY=AIzaSy...
              </code>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                Ambil key gratis di <strong>aistudio.google.com</strong>, lalu restart: <code className="font-mono">npm run dev</code>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && error !== 'NO_API_KEY' && (
        <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-3 text-xs text-red-700 dark:text-red-400">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* ── IDLE: Upload area ── */}
      {stage === 'idle' && (
        <div
          className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-600 p-10 text-center hover:border-green-400 dark:hover:border-green-500 transition-colors cursor-pointer"
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => hasApiKey && fileRef.current?.click()}
        >
          <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ScanLine size={32} className="text-green-500" />
          </div>
          <p className="font-semibold text-gray-800 dark:text-gray-100 mb-1">Foto atau Upload Struk</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
            {hasApiKey ? 'Drag & drop atau klik untuk pilih gambar' : 'Konfigurasi API Key terlebih dahulu'}
          </p>
          {hasApiKey && (
            <button className="bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 mx-auto transition-colors">
              <Upload size={16} />
              Pilih Gambar
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={e => handleFile(e.target.files[0])}
          />
        </div>
      )}

      {/* ── SCANNING: Loading ── */}
      {stage === 'scanning' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          {preview && <img src={preview} alt="Struk" className="w-full max-h-48 object-cover" />}
          <div className="p-8 text-center">
            <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="font-medium text-gray-700 dark:text-gray-200">AI sedang membaca struk...</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Mengekstrak nominal dan item belanja</p>
          </div>
        </div>
      )}

      {/* ── RESULT: Konfirmasi & Edit ── */}
      {stage === 'result' && aiResult && form && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            {preview && <img src={preview} alt="Struk" className="w-full max-h-40 object-cover" />}

            {/* AI result summary */}
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border-b border-green-100 dark:border-green-800">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400 text-sm font-medium mb-2">
                <Check size={16} />
                Struk berhasil dibaca AI
              </div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{aiResult.store_name}</p>
              {aiResult.items?.length > 0 && (
                <div className="mt-1.5 space-y-0.5 max-h-24 overflow-y-auto">
                  {aiResult.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>{item.name}</span>
                      <span>{formatRupiah(item.price)}</span>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-sm font-bold text-gray-800 dark:text-gray-100 mt-2 pt-2 border-t border-green-100 dark:border-green-800">
                Total: {formatRupiah(aiResult.total_amount)}
              </p>
            </div>

            {/* Editable confirmation form */}
            <div className="p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Konfirmasi & Koreksi</p>

              {/* Nominal */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Nominal (Rp)</label>
                <RupiahInput
                  rawValue={form.amount}
                  onRawChange={v => setForm(f => ({ ...f, amount: v }))}
                  className={ic}
                  placeholder="0"
                  required
                />
              </div>

              {/* Kantong — required */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                  Kantong <span className="text-red-500">*</span>
                </label>
                {wallets.length === 0 ? (
                  <p className="text-xs text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-3 py-2 rounded-lg">
                    Buat kantong terlebih dahulu sebelum menyimpan transaksi.
                  </p>
                ) : (
                  <select value={form.wallet_id} onChange={e => handleWalletChange(e.target.value)} className={sc} required>
                    <option value="">— Pilih kantong —</option>
                    {wallets.map(w => (
                      <option key={w.id} value={w.id}>{w.icon} {w.name} ({formatRupiah(Number(w.balance))})</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Metode pembayaran — auto, read-only */}
              {form.wallet_id && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                    Metode Pembayaran
                    <span className="ml-1.5 text-[10px] font-normal text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded-full">
                      {lang === 'id' ? 'otomatis' : 'auto'}
                    </span>
                  </label>
                  <div className={`${ic} bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 cursor-default capitalize`}>
                    {{ cash: '💵 Tunai', transfer: '🏦 Transfer Bank', ewallet: '📱 E-Wallet' }[form.payment_method] ?? form.payment_method}
                  </div>
                </div>
              )}

              {/* Kategori */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Kategori</label>
                <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} className={sc}>
                  <option value="">— Tanpa kategori —</option>
                  {expCats.map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>

              {/* Tanggal */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Tanggal</label>
                <input
                  type="date"
                  value={form.trx_date}
                  onChange={e => setForm(f => ({ ...f, trx_date: e.target.value }))}
                  className={ic}
                />
              </div>

              {/* Catatan */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Catatan</label>
                <input
                  type="text"
                  value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  className={ic}
                  placeholder="Catatan transaksi"
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button onClick={reset}
              className="flex items-center gap-1.5 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <RefreshCw size={14} />
              Scan Ulang
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.wallet_id}
              className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-lg text-sm font-semibold transition-colors">
              {saving ? 'Menyimpan...' : 'Simpan Transaksi'}
            </button>
          </div>
        </div>
      )}

      {/* ── DONE: Success ── */}
      {stage === 'done' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-10 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-green-500" />
          </div>
          <p className="font-semibold text-gray-800 dark:text-gray-100 mb-1">Transaksi Tersimpan!</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">Struk berhasil dicatat ke transaksi</p>
          <button
            onClick={reset}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">
            Scan Struk Lain
          </button>
        </div>
      )}
    </div>
  );
}

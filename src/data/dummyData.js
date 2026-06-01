export const currentUser = {
  id: 'user-1',
  name: 'Fajar',
  email: 'fajar@keluarga.com',
};

export const categories = [
  { id: 'c1', name: 'Makan & Minum', type: 'expense', icon: '🍔', color: '#f97316' },
  { id: 'c2', name: 'Transport', type: 'expense', icon: '🚗', color: '#3b82f6' },
  { id: 'c3', name: 'Belanja', type: 'expense', icon: '🛍️', color: '#a855f7' },
  { id: 'c4', name: 'Tagihan', type: 'expense', icon: '📱', color: '#ef4444' },
  { id: 'c5', name: 'Hiburan', type: 'expense', icon: '🎮', color: '#ec4899' },
  { id: 'c6', name: 'Kesehatan', type: 'expense', icon: '💊', color: '#14b8a6' },
  { id: 'c7', name: 'Pendidikan', type: 'expense', icon: '📚', color: '#8b5cf6' },
  { id: 'c8', name: 'Gaji', type: 'income', icon: '💰', color: '#22c55e' },
  { id: 'c9', name: 'Bonus', type: 'income', icon: '🎁', color: '#84cc16' },
  { id: 'c10', name: 'Investasi', type: 'income', icon: '📈', color: '#06b6d4' },
  { id: 'c11', name: 'Lain-lain', type: 'expense', icon: '📦', color: '#64748b' },
];

export const transactions = [
  { id: 't1', user_id: 'user-1', category_id: 'c8', type: 'income', amount: 8500000, trx_date: '2026-06-01', payment_method: 'transfer', note: 'Gaji bulan Juni' },
  { id: 't2', user_id: 'user-1', category_id: 'c1', type: 'expense', amount: 45000, trx_date: '2026-06-01', payment_method: 'tunai', note: 'Makan siang warteg' },
  { id: 't3', user_id: 'user-1', category_id: 'c2', type: 'expense', amount: 25000, trx_date: '2026-06-01', payment_method: 'ewallet', note: 'Grab ke kantor' },
  { id: 't4', user_id: 'user-1', category_id: 'c3', type: 'expense', amount: 320000, trx_date: '2026-05-31', payment_method: 'ewallet', note: 'Belanja Tokopedia' },
  { id: 't5', user_id: 'user-1', category_id: 'c4', type: 'expense', amount: 150000, trx_date: '2026-05-30', payment_method: 'transfer', note: 'Listrik PLN' },
  { id: 't6', user_id: 'user-1', category_id: 'c4', type: 'expense', amount: 89000, trx_date: '2026-05-30', payment_method: 'ewallet', note: 'Paket internet Telkomsel' },
  { id: 't7', user_id: 'user-1', category_id: 'c5', type: 'expense', amount: 55000, trx_date: '2026-05-29', payment_method: 'ewallet', note: 'Netflix' },
  { id: 't8', user_id: 'user-1', category_id: 'c1', type: 'expense', amount: 78000, trx_date: '2026-05-29', payment_method: 'tunai', note: 'Makan malam keluarga' },
  { id: 't9', user_id: 'user-1', category_id: 'c10', type: 'income', amount: 250000, trx_date: '2026-05-28', payment_method: 'transfer', note: 'Dividen reksa dana' },
  { id: 't10', user_id: 'user-1', category_id: 'c6', type: 'expense', amount: 120000, trx_date: '2026-05-27', payment_method: 'tunai', note: 'Obat apotek' },
  { id: 't11', user_id: 'user-1', category_id: 'c1', type: 'expense', amount: 35000, trx_date: '2026-05-27', payment_method: 'tunai', note: 'Sarapan bubur ayam' },
  { id: 't12', user_id: 'user-1', category_id: 'c2', type: 'expense', amount: 50000, trx_date: '2026-05-26', payment_method: 'ewallet', note: 'BBM motor' },
  { id: 't13', user_id: 'user-1', category_id: 'c3', type: 'expense', amount: 450000, trx_date: '2026-05-25', payment_method: 'ewallet', note: 'Baju di Shopee' },
  { id: 't14', user_id: 'user-1', category_id: 'c9', type: 'income', amount: 1000000, trx_date: '2026-05-20', payment_method: 'transfer', note: 'Bonus proyek' },
  { id: 't15', user_id: 'user-1', category_id: 'c8', type: 'income', amount: 8500000, trx_date: '2026-05-01', payment_method: 'transfer', note: 'Gaji bulan Mei' },
  { id: 't16', user_id: 'user-1', category_id: 'c1', type: 'expense', amount: 650000, trx_date: '2026-05-15', payment_method: 'tunai', note: 'Makan-makan ulang tahun' },
  { id: 't17', user_id: 'user-1', category_id: 'c7', type: 'expense', amount: 200000, trx_date: '2026-05-10', payment_method: 'transfer', note: 'Kursus online Udemy' },
  { id: 't18', user_id: 'user-1', category_id: 'c4', type: 'expense', amount: 180000, trx_date: '2026-05-05', payment_method: 'transfer', note: 'Air PDAM' },
  { id: 't19', user_id: 'user-1', category_id: 'c8', type: 'income', amount: 8500000, trx_date: '2026-04-01', payment_method: 'transfer', note: 'Gaji bulan April' },
  { id: 't20', user_id: 'user-1', category_id: 'c3', type: 'expense', amount: 580000, trx_date: '2026-04-20', payment_method: 'ewallet', note: 'Belanja bulanan Indomaret' },
];

export const debts = [
  {
    id: 'd1', user_id: 'user-1', type: 'debt', counterparty: 'Pak Budi',
    amount: 2000000, remaining: 1500000, due_date: '2026-06-15',
    status: 'partial', note: 'Pinjam modal beli laptop',
  },
  {
    id: 'd2', user_id: 'user-1', type: 'receivable', counterparty: 'Andi Setiawan',
    amount: 500000, remaining: 500000, due_date: '2026-06-10',
    status: 'unpaid', note: 'Utang makan bareng',
  },
  {
    id: 'd3', user_id: 'user-1', type: 'receivable', counterparty: 'Sari Dewi',
    amount: 1200000, remaining: 600000, due_date: '2026-07-01',
    status: 'partial', note: 'Patungan tiket konser',
  },
  {
    id: 'd4', user_id: 'user-1', type: 'debt', counterparty: 'Bank BRI KTA',
    amount: 5000000, remaining: 3200000, due_date: '2026-12-31',
    status: 'partial', note: 'Cicilan KTA',
  },
  {
    id: 'd5', user_id: 'user-1', type: 'receivable', counterparty: 'Doni Pratama',
    amount: 300000, remaining: 0, due_date: '2026-05-01',
    status: 'paid', note: 'Titip beli barang',
  },
];

export const debtPayments = [
  { id: 'dp1', debt_id: 'd1', amount: 500000, pay_date: '2026-05-10', note: 'Bayar cicilan 1' },
  { id: 'dp2', debt_id: 'd3', amount: 600000, pay_date: '2026-05-20', note: 'Bayar setengah dulu' },
  { id: 'dp3', debt_id: 'd4', amount: 1800000, pay_date: '2026-05-01', note: 'Cicilan Mei' },
  { id: 'dp4', debt_id: 'd5', amount: 300000, pay_date: '2026-05-01', note: 'Lunas' },
];

export const budgets = [
  { id: 'b1', user_id: 'user-1', category_id: 'c1', limit_amount: 800000, period: '2026-06' },
  { id: 'b2', user_id: 'user-1', category_id: 'c2', limit_amount: 300000, period: '2026-06' },
  { id: 'b3', user_id: 'user-1', category_id: 'c3', limit_amount: 500000, period: '2026-06' },
  { id: 'b4', user_id: 'user-1', category_id: 'c4', limit_amount: 500000, period: '2026-06' },
  { id: 'b5', user_id: 'user-1', category_id: 'c5', limit_amount: 150000, period: '2026-06' },
  { id: 'b6', user_id: 'user-1', category_id: 'c6', limit_amount: 200000, period: '2026-06' },
];

export const monthlyTrend = [
  { month: 'Jan', income: 8500000, expense: 5200000 },
  { month: 'Feb', income: 8500000, expense: 6100000 },
  { month: 'Mar', income: 9500000, expense: 5800000 },
  { month: 'Apr', income: 8500000, expense: 6900000 },
  { month: 'Mei', income: 9750000, expense: 5980000 },
  { month: 'Jun', income: 8500000, expense: 743000 },
];

export const formatRupiah = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
};

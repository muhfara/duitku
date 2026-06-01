# 💰 DuitKu

## Aplikasi Catatan Keuangan Pribadi yang Simpel & Cepat

Catat pemasukan & pengeluaran, kelola dompet, hutang, tabungan tujuan, dan anggaran — semuanya dalam satu tempat.

[![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)](https://vite.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Recharts](https://img.shields.io/badge/Recharts-3-22c55e)](https://recharts.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## ✨ Fitur Utama

| Fitur | Deskripsi |
| ----- | --------- |
| 📊 **Dashboard** | Ringkasan saldo, pemasukan/pengeluaran bulan ini, tren keuangan, dan status anggaran |
| 💳 **Multi-Wallet** | Kelola beberapa dompet (Tunai, Bank, E-Wallet) dengan saldo real-time dan transfer antar dompet |
| 📝 **Transaksi** | Catat pemasukan & pengeluaran dengan kategori, dompet, metode bayar, dan catatan |
| 🏦 **Tabungan** | Target tabungan berbasis tujuan (goal-based) dengan setor/tarik terhubung ke dompet |
| 🤝 **Hutang & Piutang** | Lacak hutang & piutang beserta jatuh tempo, cicilan, dan status pembayaran |
| 📅 **Anggaran** | Batas pengeluaran per kategori per bulan dengan progress bar dan peringatan |
| 📈 **Laporan & Grafik** | Area chart tren, donut komposisi kategori, dan bar realisasi vs anggaran |
| 🧾 **Scan Bon** | Upload foto struk → form transaksi terisi otomatis *(integrasi AI coming soon)* |
| 🌙 **Dark Mode** | Toggle terang/gelap, tersimpan otomatis |
| 🌐 **Bilingual** | Tampilan Bahasa Indonesia & English |
| 🔒 **Multi-Akun** | Setiap anggota keluarga punya akun terpisah dengan data yang sepenuhnya privat |

---

## 📸 Tampilan Aplikasi

> *Screenshot akan ditambahkan setelah deployment.*

---

## 🚀 Mulai Cepat

### Prasyarat

- **Node.js** v18+
- Akun **Insforge** (untuk database & autentikasi)

### Instalasi

```bash
# 1. Clone repositori
git clone https://github.com/muhfara/duitku.git
cd duitku

# 2. Install dependensi
npm install

# 3. Buat file environment
cp .env.example .env
# Edit .env dan isi VITE_INSFORGE_URL & VITE_INSFORGE_ANON_KEY
```

### Konfigurasi Environment

Buat file `.env` di root proyek:

```env
VITE_INSFORGE_URL=https://your-project.insforge.io
VITE_INSFORGE_ANON_KEY=your-anon-key-here
```

### Setup Database

Jalankan migration secara berurutan di Insforge SQL Editor:

```text
migrations/
├── 20260601051514_init-schema.sql          # Schema awal (profiles, categories, transactions, debts, budgets, receipts)
├── 20260601065044_add-wallets-savings.sql  # Dompet & tabungan
└── 20260601090000_debts-wallet-category.sql # Kolom wallet & category di debts
```

### Jalankan Aplikasi

```bash
# Mode development
npm run dev

# Build production
npm run build

# Preview build
npm run preview
```

Buka <http://localhost:5173> di browser.

---

## 🗂️ Struktur Proyek

```text
duitku/
├── migrations/          # SQL migration files
├── public/              # Asset statis
└── src/
    ├── components/
    │   ├── Layout.jsx   # Navigasi & shell utama
    │   └── shared.jsx   # Komponen reusable (Modal, Spinner, dll.)
    ├── context/
    │   └── AppContext.jsx  # Auth, dark mode, bahasa
    ├── lib/
    │   ├── insforge.js  # Insforge client
    │   ├── useData.js   # Data fetching & mutation functions
    │   └── i18n.js      # Terjemahan ID/EN
    ├── pages/
    │   ├── Dashboard.jsx
    │   ├── Transactions.jsx
    │   ├── Wallets.jsx
    │   ├── Savings.jsx
    │   ├── Debts.jsx
    │   ├── Budget.jsx
    │   ├── Reports.jsx
    │   ├── ScanBon.jsx
    │   ├── Profile.jsx
    │   └── Login.jsx
    └── App.jsx          # Router & route guards
```

---

## 🏗️ Arsitektur & Tech Stack

```text
Frontend  →  React 19 + Vite 8 + Tailwind CSS 3
Grafik    →  Recharts 3 (area/donut/bar chart)
Icons     →  lucide-react
Routing   →  React Router v7
BaaS      →  Insforge (PostgreSQL + Auth OTP)
Deploy    →  Vercel
Biaya     →  Rp 0 (semua free tier)
```

### Database Triggers (otomatis)

Konsistensi data dijaga via database trigger tanpa logika di frontend:

- Transaksi INSERT/UPDATE/DELETE → saldo dompet diperbarui otomatis
- Debt payment INSERT → sisa & status hutang diperbarui otomatis
- Savings transaction INSERT → jumlah terkumpul & status tabungan diperbarui otomatis
- User baru → 11 kategori default + 3 dompet default dibuat otomatis

---

## 📊 Skema Database

```text
PROFILES ──┬── CATEGORIES ──── TRANSACTIONS ──── WALLETS
           ├── WALLETS          DEBTS ─────────── DEBT_PAYMENTS
           ├── TRANSACTIONS     BUDGETS
           ├── DEBTS            SAVINGS ────────── SAVINGS_TRANSACTIONS
           ├── BUDGETS          RECEIPTS
           ├── SAVINGS
           └── RECEIPTS
```

Semua tabel dilindungi **Row Level Security** — data pengguna A tidak bisa diakses pengguna B.

---

## 🚢 Deployment ke Vercel

1. Fork/clone repo ini ke GitHub kamu
2. Import ke [vercel.com](https://vercel.com)
3. Tambahkan environment variables di Vercel dashboard:
   - `VITE_INSFORGE_URL`
   - `VITE_INSFORGE_ANON_KEY`
4. Deploy — `vercel.json` sudah dikonfigurasi untuk SPA routing

---

## 🗺️ Roadmap

- [x] Auth multi-akun (email + OTP)
- [x] Pencatatan transaksi & kategori
- [x] Multi-wallet dengan transfer antar dompet
- [x] Tabungan tujuan (goal-based savings)
- [x] Hutang & piutang dengan cicilan
- [x] Budgeting per kategori
- [x] Laporan & grafik
- [x] Dark mode & bilingual (ID/EN)
- [ ] Scan bon via Gemini API (AI/OCR)
- [ ] Fallback scan dengan Tesseract.js (lokal, tanpa internet)
- [ ] Ekspor data CSV/Excel
- [ ] PWA & mode offline

---

## 🤝 Kontribusi

Kontribusi sangat terbuka! Silakan:

1. Fork repositori ini
2. Buat branch baru (`git checkout -b fitur/nama-fitur`)
3. Commit perubahan (`git commit -m 'feat: tambah fitur X'`)
4. Push ke branch (`git push origin fitur/nama-fitur`)
5. Buka Pull Request

---

## 📄 Lisensi

Proyek ini menggunakan lisensi **MIT** — bebas digunakan, dimodifikasi, dan didistribusikan.

---

Dibuat dengan ❤️ oleh [Fajar](https://github.com/muhfara)

-- ============================================================
-- DuitKu — Performance fixes
-- Issue 1-12 : Missing FK indexes
-- Issue 13-22: RLS auth.uid() per row → wrap in subquery
-- Issue 23-30: Missing RLS indexes (deduplicated with above)
-- Note: Issue 24 (debt_payments.user_id) SKIPPED — column does not exist
-- ============================================================

-- ============================================================
-- BAGIAN 1 — Index untuk FK columns (Issues 1–12)
--            + RLS columns (Issues 23–30, sebagian overlap)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_categories_user_id         ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id   ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id        ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id      ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_debts_user_id               ON debts(user_id);
CREATE INDEX IF NOT EXISTS idx_debts_wallet_id             ON debts(wallet_id);
CREATE INDEX IF NOT EXISTS idx_debt_payments_debt_id       ON debt_payments(debt_id);
CREATE INDEX IF NOT EXISTS idx_budgets_category_id         ON budgets(category_id);
CREATE INDEX IF NOT EXISTS idx_receipts_user_id            ON receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id             ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_user_id             ON savings(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_transactions_savings_id ON savings_transactions(savings_id);
-- Issue 28: savings_transactions.user_id (kolom ditambahkan di migration savings_sharing)
CREATE INDEX IF NOT EXISTS idx_savings_transactions_user_id ON savings_transactions(user_id);

-- ============================================================
-- BAGIAN 2 — Fix RLS policies: auth.uid() → (select auth.uid())
--            Evaluasi sekali per query, bukan per baris
-- ============================================================

-- Issue 13: budgets_own
DROP POLICY IF EXISTS "budgets_own" ON budgets;
CREATE POLICY "budgets_own" ON budgets FOR ALL TO authenticated
  USING  (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Issue 14: categories_own
DROP POLICY IF EXISTS "categories_own" ON categories;
CREATE POLICY "categories_own" ON categories FOR ALL TO authenticated
  USING  (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Issue 15: debt_payments_own (pakai EXISTS ke debts, bukan user_id langsung)
DROP POLICY IF EXISTS "debt_payments_own" ON debt_payments;
CREATE POLICY "debt_payments_own" ON debt_payments FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM debts d
    WHERE d.id = debt_payments.debt_id AND d.user_id = (SELECT auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM debts d
    WHERE d.id = debt_payments.debt_id AND d.user_id = (SELECT auth.uid())
  ));

-- Issue 16: debts_own
DROP POLICY IF EXISTS "debts_own" ON debts;
CREATE POLICY "debts_own" ON debts FOR ALL TO authenticated
  USING  (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Issue 17: profiles_own
DROP POLICY IF EXISTS "profiles_own" ON profiles;
CREATE POLICY "profiles_own" ON profiles FOR ALL TO authenticated
  USING  (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- Issue 18: receipts_own
DROP POLICY IF EXISTS "receipts_own" ON receipts;
CREATE POLICY "receipts_own" ON receipts FOR ALL TO authenticated
  USING  (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Issue 19: savings_own
DROP POLICY IF EXISTS "savings_own" ON savings;
CREATE POLICY "savings_own" ON savings FOR ALL TO authenticated
  USING  (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Issue 20: savings_trx_own (pakai EXISTS ke savings)
DROP POLICY IF EXISTS "savings_trx_own" ON savings_transactions;
CREATE POLICY "savings_trx_own" ON savings_transactions FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM savings s
    WHERE s.id = savings_transactions.savings_id AND s.user_id = (SELECT auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM savings s
    WHERE s.id = savings_transactions.savings_id AND s.user_id = (SELECT auth.uid())
  ));

-- Issue 21: transactions_own
DROP POLICY IF EXISTS "transactions_own" ON transactions;
CREATE POLICY "transactions_own" ON transactions FOR ALL TO authenticated
  USING  (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Issue 22: wallets_own
DROP POLICY IF EXISTS "wallets_own" ON wallets;
CREATE POLICY "wallets_own" ON wallets FOR ALL TO authenticated
  USING  (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

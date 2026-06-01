-- ============================================================
-- DuitKu — Initial Schema
-- ============================================================

-- ---- PROFILES ----
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL DEFAULT '',
  currency    TEXT NOT NULL DEFAULT 'IDR',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_own" ON profiles FOR ALL TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.profile->>'name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---- CATEGORIES ----
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  icon        TEXT NOT NULL DEFAULT '📦',
  color       TEXT NOT NULL DEFAULT '#64748b',
  is_default  BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_own" ON categories FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
GRANT SELECT, INSERT, UPDATE, DELETE ON categories TO authenticated;

-- ---- TRANSACTIONS ----
CREATE TABLE transactions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id    UUID REFERENCES categories(id) ON DELETE SET NULL,
  receipt_id     UUID,
  type           TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount         NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  trx_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'tunai',
  note           TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transactions_own" ON transactions FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
GRANT SELECT, INSERT, UPDATE, DELETE ON transactions TO authenticated;

-- ---- DEBTS ----
CREATE TABLE debts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('debt', 'receivable')),
  counterparty  TEXT NOT NULL,
  amount        NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  remaining     NUMERIC(15,2) NOT NULL,
  due_date      DATE,
  status        TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partial', 'paid')),
  note          TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "debts_own" ON debts FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
GRANT SELECT, INSERT, UPDATE, DELETE ON debts TO authenticated;

-- ---- DEBT PAYMENTS ----
CREATE TABLE debt_payments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id    UUID NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  amount     NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  pay_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  note       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE debt_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "debt_payments_own" ON debt_payments FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM debts d WHERE d.id = debt_payments.debt_id AND d.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM debts d WHERE d.id = debt_payments.debt_id AND d.user_id = auth.uid())
  );
GRANT SELECT, INSERT, UPDATE, DELETE ON debt_payments TO authenticated;

-- Trigger: update debt remaining & status after payment insert
CREATE OR REPLACE FUNCTION public.update_debt_on_payment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE debts
  SET
    remaining = GREATEST(0, remaining - NEW.amount),
    status = CASE
      WHEN GREATEST(0, remaining - NEW.amount) = 0 THEN 'paid'
      ELSE 'partial'
    END
  WHERE id = NEW.debt_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER debt_payment_inserted
  AFTER INSERT ON debt_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_debt_on_payment();

-- ---- BUDGETS ----
CREATE TABLE budgets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id   UUID REFERENCES categories(id) ON DELETE CASCADE,
  limit_amount  NUMERIC(15,2) NOT NULL CHECK (limit_amount > 0),
  period        TEXT NOT NULL,
  period_start  DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, category_id, period)
);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "budgets_own" ON budgets FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
GRANT SELECT, INSERT, UPDATE, DELETE ON budgets TO authenticated;

-- ---- RECEIPTS ----
CREATE TABLE receipts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url     TEXT,
  image_key     TEXT,
  ocr_raw_text  TEXT,
  parsed_data   JSONB,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "receipts_own" ON receipts FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
GRANT SELECT, INSERT, UPDATE, DELETE ON receipts TO authenticated;

-- ---- DEFAULT CATEGORIES AUTO-SEED ----
CREATE OR REPLACE FUNCTION public.seed_default_categories(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO categories (user_id, name, type, icon, color, is_default) VALUES
    (p_user_id, 'Makan & Minum', 'expense', '🍔', '#f97316', TRUE),
    (p_user_id, 'Transport',     'expense', '🚗', '#3b82f6', TRUE),
    (p_user_id, 'Belanja',       'expense', '🛍️', '#a855f7', TRUE),
    (p_user_id, 'Tagihan',       'expense', '📱', '#ef4444', TRUE),
    (p_user_id, 'Hiburan',       'expense', '🎮', '#ec4899', TRUE),
    (p_user_id, 'Kesehatan',     'expense', '💊', '#14b8a6', TRUE),
    (p_user_id, 'Pendidikan',    'expense', '📚', '#8b5cf6', TRUE),
    (p_user_id, 'Lain-lain',     'expense', '📦', '#64748b', TRUE),
    (p_user_id, 'Gaji',          'income',  '💰', '#22c55e', TRUE),
    (p_user_id, 'Bonus',         'income',  '🎁', '#84cc16', TRUE),
    (p_user_id, 'Investasi',     'income',  '📈', '#06b6d4', TRUE)
  ON CONFLICT DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user_categories()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.seed_default_categories(NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_seed_categories
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_categories();

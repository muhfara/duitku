-- ============================================================
-- DuitKu — Wallets, Savings, wallet_id on transactions
-- ============================================================

-- ---- WALLETS ----
CREATE TABLE wallets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'cash' CHECK (type IN ('cash','bank','ewallet','other')),
  balance     NUMERIC(15,2) NOT NULL DEFAULT 0,
  color       TEXT NOT NULL DEFAULT '#64748b',
  icon        TEXT NOT NULL DEFAULT '💳',
  is_default  BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallets_own" ON wallets FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
GRANT SELECT, INSERT, UPDATE, DELETE ON wallets TO authenticated;

-- ---- Add wallet_id to transactions ----
ALTER TABLE transactions ADD COLUMN wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL;

-- Trigger: update wallet balance on transaction insert
CREATE OR REPLACE FUNCTION public.update_wallet_on_transaction_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.wallet_id IS NOT NULL THEN
    UPDATE wallets SET balance =
      CASE WHEN NEW.type = 'income' THEN balance + NEW.amount ELSE balance - NEW.amount END
    WHERE id = NEW.wallet_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trx_insert_update_wallet
  AFTER INSERT ON transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_wallet_on_transaction_insert();

-- Trigger: restore wallet balance on transaction delete
CREATE OR REPLACE FUNCTION public.restore_wallet_on_transaction_delete()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.wallet_id IS NOT NULL THEN
    UPDATE wallets SET balance =
      CASE WHEN OLD.type = 'income' THEN balance - OLD.amount ELSE balance + OLD.amount END
    WHERE id = OLD.wallet_id;
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trx_delete_restore_wallet
  AFTER DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION public.restore_wallet_on_transaction_delete();

-- ---- SAVINGS (Tabungan) ----
CREATE TABLE savings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  target_amount  NUMERIC(15,2) NOT NULL CHECK (target_amount > 0),
  current_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  icon           TEXT NOT NULL DEFAULT '🎯',
  color          TEXT NOT NULL DEFAULT '#22c55e',
  deadline       DATE,
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  note           TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE savings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "savings_own" ON savings FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
GRANT SELECT, INSERT, UPDATE, DELETE ON savings TO authenticated;

-- ---- SAVINGS TRANSACTIONS ----
CREATE TABLE savings_transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  savings_id  UUID NOT NULL REFERENCES savings(id) ON DELETE CASCADE,
  amount      NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  type        TEXT NOT NULL CHECK (type IN ('deposit','withdraw')),
  note        TEXT,
  trx_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE savings_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "savings_trx_own" ON savings_transactions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM savings s WHERE s.id = savings_transactions.savings_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM savings s WHERE s.id = savings_transactions.savings_id AND s.user_id = auth.uid()));
GRANT SELECT, INSERT, UPDATE, DELETE ON savings_transactions TO authenticated;

-- Trigger: update savings current_amount on savings_transaction insert
CREATE OR REPLACE FUNCTION public.update_savings_on_deposit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE savings SET
    current_amount = GREATEST(0,
      CASE WHEN NEW.type = 'deposit' THEN current_amount + NEW.amount ELSE current_amount - NEW.amount END),
    status = CASE
      WHEN (CASE WHEN NEW.type = 'deposit' THEN current_amount + NEW.amount ELSE current_amount - NEW.amount END) >= target_amount THEN 'completed'
      ELSE status
    END
  WHERE id = NEW.savings_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER savings_trx_inserted
  AFTER INSERT ON savings_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_savings_on_deposit();

-- ---- Auto-seed default wallets for new users ----
CREATE OR REPLACE FUNCTION public.seed_default_wallets(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO wallets (user_id, name, type, balance, color, icon, is_default) VALUES
    (p_user_id, 'Tunai',    'cash',    0, '#22c55e', '💵', TRUE),
    (p_user_id, 'Bank BCA', 'bank',    0, '#1e40af', '🏦', FALSE),
    (p_user_id, 'GoPay',    'ewallet', 0, '#00aed6', '📱', FALSE)
  ON CONFLICT DO NOTHING;
END;
$$;

-- Update the profile-created trigger to also seed wallets
CREATE OR REPLACE FUNCTION public.handle_new_user_categories()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.seed_default_categories(NEW.id);
  PERFORM public.seed_default_wallets(NEW.id);
  RETURN NEW;
END;
$$;

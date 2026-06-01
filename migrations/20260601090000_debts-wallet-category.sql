-- ============================================================
-- DuitKu — Debts: tambah wallet_id, category; Trigger UPDATE transaksi
-- ============================================================

-- Tambah wallet_id dan category ke debts
ALTER TABLE debts ADD COLUMN IF NOT EXISTS wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL;
ALTER TABLE debts ADD COLUMN IF NOT EXISTS category TEXT;

-- Trigger UPDATE transaksi: sesuaikan saldo dompet
CREATE OR REPLACE FUNCTION public.update_wallet_on_transaction_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.wallet_id IS NOT NULL THEN
    UPDATE wallets SET balance =
      CASE WHEN OLD.type = 'income' THEN balance - OLD.amount ELSE balance + OLD.amount END
    WHERE id = OLD.wallet_id;
  END IF;
  IF NEW.wallet_id IS NOT NULL THEN
    UPDATE wallets SET balance =
      CASE WHEN NEW.type = 'income' THEN balance + NEW.amount ELSE balance - NEW.amount END
    WHERE id = NEW.wallet_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trx_update_wallet
  AFTER UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_wallet_on_transaction_update();

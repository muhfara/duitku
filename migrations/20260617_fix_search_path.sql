-- ============================================================
-- DuitKu — Fix: SET search_path = '' membutuhkan nama tabel fully-qualified
-- Semua trigger/internal function yang pakai tabel tanpa prefix public.
-- harus direcreate dengan public.tablename agar terbaca saat search_path kosong.
-- ============================================================

-- 1. update_wallet_on_transaction_insert
CREATE OR REPLACE FUNCTION public.update_wallet_on_transaction_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.wallet_id IS NOT NULL THEN
    UPDATE public.wallets SET balance =
      CASE WHEN NEW.type = 'income' THEN balance + NEW.amount ELSE balance - NEW.amount END
    WHERE id = NEW.wallet_id;
  END IF;
  RETURN NEW;
END;
$$;

-- 2. update_wallet_on_transaction_update
CREATE OR REPLACE FUNCTION public.update_wallet_on_transaction_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.wallet_id IS NOT NULL THEN
    UPDATE public.wallets SET balance =
      CASE WHEN OLD.type = 'income' THEN balance - OLD.amount ELSE balance + OLD.amount END
    WHERE id = OLD.wallet_id;
  END IF;
  IF NEW.wallet_id IS NOT NULL THEN
    UPDATE public.wallets SET balance =
      CASE WHEN NEW.type = 'income' THEN balance + NEW.amount ELSE balance - NEW.amount END
    WHERE id = NEW.wallet_id;
  END IF;
  RETURN NEW;
END;
$$;

-- 3. restore_wallet_on_transaction_delete
CREATE OR REPLACE FUNCTION public.restore_wallet_on_transaction_delete()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.wallet_id IS NOT NULL THEN
    UPDATE public.wallets SET balance =
      CASE WHEN OLD.type = 'income' THEN balance - OLD.amount ELSE balance + OLD.amount END
    WHERE id = OLD.wallet_id;
  END IF;
  RETURN OLD;
END;
$$;

-- 4. update_debt_on_payment
CREATE OR REPLACE FUNCTION public.update_debt_on_payment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.debts
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

-- 5. update_savings_on_deposit
CREATE OR REPLACE FUNCTION public.update_savings_on_deposit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.savings SET
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

-- 6. seed_default_categories
CREATE OR REPLACE FUNCTION public.seed_default_categories(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.categories (user_id, name, type, icon, color, is_default) VALUES
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

-- 7. seed_default_wallets
CREATE OR REPLACE FUNCTION public.seed_default_wallets(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.wallets (user_id, name, type, balance, color, icon, is_default) VALUES
    (p_user_id, 'Tunai',    'cash',    0, '#22c55e', '💵', TRUE),
    (p_user_id, 'Bank BCA', 'bank',    0, '#1e40af', '🏦', FALSE),
    (p_user_id, 'GoPay',    'ewallet', 0, '#00aed6', '📱', FALSE)
  ON CONFLICT DO NOTHING;
END;
$$;

-- 8. handle_new_user — sudah pakai public.profiles, tapi ikut diperbarui untuk konsistensi
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.profile->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email WHERE public.profiles.email IS NULL;
  RETURN NEW;
END;
$$;

-- 9. handle_new_user_categories — sudah pakai public., konfirmasi ulang
CREATE OR REPLACE FUNCTION public.handle_new_user_categories()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.seed_default_categories(NEW.id);
  PERFORM public.seed_default_wallets(NEW.id);
  RETURN NEW;
END;
$$;

-- ============================================================
-- DuitKu — Security fixes (11 issues)
-- ============================================================

-- ============================================================
-- Issues 1-10: Kunci search_path pada semua SECURITY DEFINER function
-- Trigger functions: REVOKE EXECUTE FROM public (tidak perlu dipanggil user langsung)
-- check_savings_member: tetap GRANT TO authenticated (dibutuhkan oleh RLS policy)
-- ============================================================

-- Issue 1: check_savings_member — tetap SECURITY DEFINER + authenticated, hanya kunci search_path
ALTER FUNCTION public.check_savings_member(p_savings_id UUID) SET search_path = '';

-- Issue 2: handle_new_user — trigger function
ALTER FUNCTION public.handle_new_user() SET search_path = '';
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;

-- Issue 3: update_debt_on_payment — trigger function
ALTER FUNCTION public.update_debt_on_payment() SET search_path = '';
REVOKE EXECUTE ON FUNCTION public.update_debt_on_payment() FROM PUBLIC;

-- Issue 4: seed_default_categories — internal seeder, dipanggil dari trigger
ALTER FUNCTION public.seed_default_categories(p_user_id UUID) SET search_path = '';
REVOKE EXECUTE ON FUNCTION public.seed_default_categories(p_user_id UUID) FROM PUBLIC;

-- Issue 5: handle_new_user_categories — trigger function
ALTER FUNCTION public.handle_new_user_categories() SET search_path = '';
REVOKE EXECUTE ON FUNCTION public.handle_new_user_categories() FROM PUBLIC;

-- Issue 6: update_wallet_on_transaction_insert — trigger function
ALTER FUNCTION public.update_wallet_on_transaction_insert() SET search_path = '';
REVOKE EXECUTE ON FUNCTION public.update_wallet_on_transaction_insert() FROM PUBLIC;

-- Issue 7: restore_wallet_on_transaction_delete — trigger function
ALTER FUNCTION public.restore_wallet_on_transaction_delete() SET search_path = '';
REVOKE EXECUTE ON FUNCTION public.restore_wallet_on_transaction_delete() FROM PUBLIC;

-- Issue 8: update_savings_on_deposit — trigger function
ALTER FUNCTION public.update_savings_on_deposit() SET search_path = '';
REVOKE EXECUTE ON FUNCTION public.update_savings_on_deposit() FROM PUBLIC;

-- Issue 9: seed_default_wallets — internal seeder, dipanggil dari trigger
ALTER FUNCTION public.seed_default_wallets(p_user_id UUID) SET search_path = '';
REVOKE EXECUTE ON FUNCTION public.seed_default_wallets(p_user_id UUID) FROM PUBLIC;

-- Issue 10: update_wallet_on_transaction_update — trigger function
ALTER FUNCTION public.update_wallet_on_transaction_update() SET search_path = '';
REVOKE EXECUTE ON FUNCTION public.update_wallet_on_transaction_update() FROM PUBLIC;

-- ============================================================
-- Issue 11: profiles_read_public USING (true) — terlalu permisif
-- Fix: restrict ke own profile + buat RPC function untuk savings sharing
-- ============================================================

-- Ganti policy menjadi own-profile-only
DROP POLICY IF EXISTS "profiles_read_public" ON profiles;
CREATE POLICY "profiles_read_public" ON profiles FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

-- RPC untuk mencari user berdasarkan email (dipakai fitur undang anggota tabungan)
-- SECURITY DEFINER dengan search_path terkunci — hanya kembalikan id + full_name, bukan email
CREATE OR REPLACE FUNCTION public.find_profile_by_email(p_email TEXT)
RETURNS TABLE(id UUID, full_name TEXT)
LANGUAGE SQL SECURITY DEFINER STABLE
SET search_path = ''
AS $$
  SELECT p.id, p.full_name
  FROM public.profiles p
  WHERE p.email = lower(trim(p_email))
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.find_profile_by_email(TEXT) TO authenticated;

-- RPC untuk mengambil profil anggota tabungan berdasarkan daftar user_id
-- SECURITY DEFINER dengan search_path terkunci — hanya kembalikan id + full_name
CREATE OR REPLACE FUNCTION public.get_profiles_by_ids(p_ids UUID[])
RETURNS TABLE(id UUID, full_name TEXT)
LANGUAGE SQL SECURITY DEFINER STABLE
SET search_path = ''
AS $$
  SELECT p.id, p.full_name
  FROM public.profiles p
  WHERE p.id = ANY(p_ids);
$$;
GRANT EXECUTE ON FUNCTION public.get_profiles_by_ids(UUID[]) TO authenticated;

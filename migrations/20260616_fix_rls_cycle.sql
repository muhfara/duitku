-- ============================================================
-- DuitKu — Fix: Circular RLS dependency pada savings sharing
-- Masalah: savings_member_read → savings_members (RLS) → savings (RLS) → savings_member_read (loop!)
-- Solusi: SECURITY DEFINER function untuk cek member, bypass RLS sehingga tidak ada siklus
-- ============================================================

-- 1. Buat fungsi SECURITY DEFINER untuk cek apakah user adalah member sebuah savings
--    SECURITY DEFINER = berjalan sebagai pemilik fungsi (superuser), bukan sebagai user biasa
--    Ini memutus siklus RLS karena membaca savings_members tanpa menerapkan RLS-nya
CREATE OR REPLACE FUNCTION public.check_savings_member(p_savings_id UUID)
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.savings_members
    WHERE savings_id = p_savings_id AND user_id = auth.uid()
  );
$$;
GRANT EXECUTE ON FUNCTION public.check_savings_member TO authenticated;

-- 2. Ganti savings_member_read supaya pakai fungsi di atas (tidak ada siklus)
DROP POLICY IF EXISTS "savings_member_read" ON savings;
CREATE POLICY "savings_member_read" ON savings FOR SELECT TO authenticated
  USING (public.check_savings_member(id));

-- 3. Ganti savings_trx_member_read supaya pakai fungsi yang sama
DROP POLICY IF EXISTS "savings_trx_member_read" ON savings_transactions;
CREATE POLICY "savings_trx_member_read" ON savings_transactions FOR SELECT TO authenticated
  USING (public.check_savings_member(savings_id));

-- 4. Ganti savings_trx_member_insert supaya pakai fungsi yang sama
DROP POLICY IF EXISTS "savings_trx_member_insert" ON savings_transactions;
CREATE POLICY "savings_trx_member_insert" ON savings_transactions FOR INSERT TO authenticated
  WITH CHECK (public.check_savings_member(savings_id));

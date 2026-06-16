-- ============================================================
-- DuitKu — Performance fixes: savings_members table
-- Issue 1,6-9 : Index untuk FK + RLS column savings_members.user_id
-- Issue 2-4   : Wrap auth.uid() dalam subquery pada 3 RLS policy
-- Issue 5     : debt_payments.user_id SKIPPED — kolom tidak ada di tabel itu
-- ============================================================

-- Issues 1, 6-9: satu index menyelesaikan semua (duplikat karena 4 policy berbeda)
CREATE INDEX IF NOT EXISTS idx_savings_members_user_id ON savings_members(user_id);

-- Issue 2: savings_members_delete
DROP POLICY IF EXISTS "savings_members_delete" ON savings_members;
CREATE POLICY "savings_members_delete" ON savings_members FOR DELETE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM savings s WHERE s.id = savings_id AND s.user_id = (SELECT auth.uid()))
  );

-- Issue 3: savings_members_insert
DROP POLICY IF EXISTS "savings_members_insert" ON savings_members;
CREATE POLICY "savings_members_insert" ON savings_members FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM savings s WHERE s.id = savings_id AND s.user_id = (SELECT auth.uid())
  ));

-- Issue 4: savings_members_select
DROP POLICY IF EXISTS "savings_members_select" ON savings_members;
CREATE POLICY "savings_members_select" ON savings_members FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM savings s WHERE s.id = savings_id AND s.user_id = (SELECT auth.uid()))
  );
